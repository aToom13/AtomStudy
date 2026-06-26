import 'package:flutter/material.dart';

import 'package:mobile/features/solution/services/api_service.dart';
import 'package:mobile/core/services/question_storage_service.dart';
import 'package:url_launcher/url_launcher.dart';

class RecommendationsScreen extends StatefulWidget {
  const RecommendationsScreen({super.key});

  @override
  State<RecommendationsScreen> createState() => _RecommendationsScreenState();
}

class _RecommendationsScreenState extends State<RecommendationsScreen> {
  final ApiService _apiService = ApiService();
  final QuestionStorageService _storage = QuestionStorageService();
  final TextEditingController _searchController = TextEditingController();

  // Data
  final Map<String, List<String>> _lessonTopics = {
    'Fizik': ['Dinamik', 'Optik', 'Hareket', 'Elektrik'],
    'Matematik': ['Türev', 'İntegral', 'Fonksiyonlar', 'Logaritma'],
    'Kimya': ['Mol Kavramı', 'Gazlar', 'Organik Kimya'],
    'Biyoloji': ['Hücre', 'Sistemler', 'Bitki Biyolojisi'],
  };

  // Selection State
  String? _selectedLesson;
  String? _selectedTopic;

  // Results State
  bool _isLoading = false;
  List<Map<String, String>> _videos = [];
  bool _hasSearched = false;
  List<String> _weakTopics = [];

  @override
  void initState() {
    super.initState();
    _loadWeakTopics();
  }

  Future<void> _loadWeakTopics() async {
    await _storage.init();
    final stats = await _storage.getTopicStats();
    if (mounted) {
      setState(() {
        // topics with < 60% success rate
        _weakTopics = stats.entries
            .where((e) => e.value < 0.6)
            .map((e) => e.key)
            .toList();
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF1A1A2E) : Colors.grey[100];

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Text('Ders Önerileri'),
        backgroundColor: Colors.redAccent,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          _buildFilterSection(isDark),
          Expanded(child: _buildResultsList(isDark)),
        ],
      ),
    );
  }

  Widget _buildFilterSection(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF16213E) : Colors.white,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Search Bar
          TextField(
            controller: _searchController,
            style: TextStyle(color: isDark ? Colors.white : Colors.black),
            decoration: InputDecoration(
              hintText: 'Video veya konu ara...',
              hintStyle: TextStyle(
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
              prefixIcon: const Icon(Icons.search),
              suffixIcon: IconButton(
                icon: const Icon(Icons.arrow_forward),
                onPressed: () => _searchVideos(_searchController.text),
              ),
              filled: true,
              fillColor: isDark ? Colors.grey[800] : Colors.grey[100],
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 0),
            ),
            onSubmitted: _searchVideos,
          ),

          // 2. Weakness Chips (if any)
          if (_weakTopics.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              'Eksiklerine Göre Öneriler',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.redAccent.withOpacity(0.9),
              ),
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _weakTopics.map((topic) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ActionChip(
                      avatar: const Icon(
                        Icons.priority_high,
                        size: 16,
                        color: Colors.white,
                      ),
                      label: Text(topic),
                      backgroundColor: Colors.redAccent,
                      labelStyle: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                      onPressed: () =>
                          _searchVideos('$topic konu anlatımı soru çözümü'),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],

          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 16),

          // 3. Dropdowns (Fallback Filter)
          const Text(
            'Veya ders seçerek ilerle:',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          // Lesson Dropdown
          _buildDropdown(
            value: _selectedLesson,
            hint: 'Ders Seçin',
            items: _lessonTopics.keys.toList(),
            onChanged: (val) {
              setState(() {
                _selectedLesson = val;
                _selectedTopic = null; // Reset topic
                // _videos = []; // Don't clear immediately, wait for topic selection
                // _hasSearched = false;
              });
            },
            isDark: isDark,
          ),
          const SizedBox(height: 12),
          // Topic Dropdown
          _buildDropdown(
            value: _selectedTopic,
            hint: 'Konu Seçin',
            items: _selectedLesson != null
                ? _lessonTopics[_selectedLesson]!
                : [],
            onChanged: (val) {
              setState(() {
                _selectedTopic = val;
                if (val != null) _searchVideos();
              });
            },
            isDark: isDark,
            enabled: _selectedLesson != null,
          ),
        ],
      ),
    );
  }

  Widget _buildDropdown({
    required String? value,
    required String hint,
    required List<String> items,
    required Function(String?) onChanged,
    required bool isDark,
    bool enabled = true,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: enabled
            ? (isDark ? Colors.grey[800] : Colors.grey[100])
            : (isDark ? Colors.grey[900] : Colors.grey[200]),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
        ),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          hint: Text(
            hint,
            style: TextStyle(
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          isExpanded: true,
          items: items.map((String item) {
            return DropdownMenuItem<String>(value: item, child: Text(item));
          }).toList(),
          onChanged: enabled ? onChanged : null,
          dropdownColor: isDark ? Colors.grey[800] : Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  Future<void> _searchVideos([String? customQuery]) async {
    if (customQuery == null &&
        (_selectedLesson == null || _selectedTopic == null)) {
      return;
    }

    setState(() {
      _isLoading = true;
      _hasSearched = true;
      if (customQuery != null) {
        // Clear dropdowns if custom search usage
        _selectedLesson = null;
        _selectedTopic = null;
        _searchController.text = customQuery;
      }
    });

    try {
      final query =
          customQuery ?? '$_selectedLesson $_selectedTopic soru çözümü';
      final results = await _apiService.searchYoutubeVideos(query);

      if (mounted) {
        setState(() {
          _videos = results;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Widget _buildResultsList(bool isDark) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (!_hasSearched) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'Ders ve konu seçimi yapın',
              style: TextStyle(
                color: isDark ? Colors.grey[500] : Colors.grey[600],
                fontSize: 16,
              ),
            ),
          ],
        ),
      );
    }

    if (_videos.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.video_library_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'Bu konuda video bulunamadı.',
              style: TextStyle(
                color: isDark ? Colors.grey[500] : Colors.grey[600],
                fontSize: 16,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _videos.length,
      itemBuilder: (context, index) {
        return _buildVideoCard(context, _videos[index], isDark);
      },
    );
  }

  Widget _buildVideoCard(
    BuildContext context,
    Map<String, String> video,
    bool isDark,
  ) {
    return GestureDetector(
      onTap: () async {
        final urlString = video['url'];
        if (urlString != null) {
          final uri = Uri.parse(urlString);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          } else {
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(const SnackBar(content: Text('Video açılamadı.')));
          }
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF16213E) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Thumbnail
            Container(
              width: 120,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  bottomLeft: Radius.circular(12),
                ),
                image:
                    video['thumbnail'] != null && video['thumbnail']!.isNotEmpty
                    ? DecorationImage(
                        image: NetworkImage(video['thumbnail']!),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: video['thumbnail'] == null || video['thumbnail']!.isEmpty
                  ? Center(
                      child: Icon(
                        Icons.play_circle_fill,
                        color: Colors.redAccent.withOpacity(0.8),
                        size: 32,
                      ),
                    )
                  : Center(
                      child: Icon(
                        Icons.play_circle_fill,
                        color: Colors.white.withOpacity(0.8),
                        size: 32,
                      ),
                    ),
            ),
            const SizedBox(width: 12),
            // Info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      video['title']!,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      video['channel']!,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      video['duration']!,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey[500] : Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
