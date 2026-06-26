import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_math_fork/flutter_math.dart';
import '../../../../core/theme/app_colors.dart';
import '../services/api_service.dart';
import '../../../core/services/question_storage_service.dart';
import '../../../core/services/subscription_service.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';

class SolutionScreen extends StatefulWidget {
  final String imagePath;
  final SolvedQuestion? question;

  const SolutionScreen({super.key, required this.imagePath, this.question});

  @override
  State<SolutionScreen> createState() => _SolutionScreenState();
}

class _SolutionScreenState extends State<SolutionScreen> {
  final ApiService _apiService = ApiService();
  final QuestionStorageService _storage = QuestionStorageService();
  final SubscriptionService _subscription = SubscriptionService();
  String? _solution;
  bool _isLoading = true;
  String? _error;
  String _topic = 'Genel';

  @override
  void initState() {
    super.initState();
    _initAndSolve();
  }

  Future<void> _initAndSolve() async {
    await _storage.init();
    await _subscription.init();

    if (widget.question != null) {
      // Viewing existing solution
      setState(() {
        _solution = widget.question!.solution;
        _topic = widget.question!.topic;
        _isLoading = false;
      });
    } else {
      // Solving new question
      await _solveQuestion();
    }
  }

  Future<void> _solveQuestion() async {
    try {
      // Compress image before sending
      final compressedFile = await FlutterImageCompress.compressAndGetFile(
        widget.imagePath,
        '${widget.imagePath}_compressed.jpg',
        quality: 85,
        minWidth: 1024,
        minHeight: 1024,
      );

      if (compressedFile == null) throw Exception("Görsel sıkıştırılamadı.");

      final bytes = await compressedFile.readAsBytes();
      final base64Image = base64Encode(bytes);
      final result = await _apiService.solveQuestion(base64Image);

      // Extract topic from solution
      _topic = _extractTopic(result);

      // Save question to storage
      final question = SolvedQuestion(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        imagePath: widget.imagePath,
        topic: _topic,
        solution: result,
        isCorrect: false, // Default to incorrect (needs studying)
        solvedAt: DateTime.now(),
      );
      await _storage.saveQuestion(question);

      // Use one quota
      await _subscription.useQuota();

      if (mounted) {
        setState(() {
          _solution = result;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  String _extractTopic(String solution) {
    // Try to extract topic from "**Konu:** ..." pattern
    final match = RegExp(r'\*\*Konu:\*\*\s*(.+)').firstMatch(solution);
    if (match != null) {
      return match.group(1)?.trim() ?? 'Genel';
    }
    return 'Genel';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF1A1A2E) : Colors.grey[100];

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Text('Çözüm'),
        backgroundColor: AppColors.pumpkinPrimary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isLoading
          ? _buildLoadingState(isDark)
          : _error != null
          ? _buildErrorState(isDark)
          : _buildSolutionContent(isDark),
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF16213E) : Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.3 : 0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              children: [
                const CircularProgressIndicator(
                  color: AppColors.pumpkinPrimary,
                ),
                const SizedBox(height: 16),
                Text(
                  'Yapay Zeka Düşünüyor...',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Soruyu analiz ediyorum',
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : Colors.grey,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF16213E) : Colors.white,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 16),
              Text(
                'Hata: $_error',
                textAlign: TextAlign.center,
                style: TextStyle(color: isDark ? Colors.white : Colors.black),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _isLoading = true;
                    _error = null;
                  });
                  _solveQuestion();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.pumpkinPrimary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Tekrar Dene'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSolutionContent(bool isDark) {
    final sections = _parseSolution(_solution ?? '');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Question Image Card
          _buildImageCard(isDark),
          const SizedBox(height: 16),

          // Solution Sections
          ...sections.asMap().entries.map((entry) {
            return _buildSectionBubble(entry.value, entry.key, isDark);
          }),

          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),

          // Tutor Section
          _buildTutorSection(isDark),
          // Add extra padding at bottom for keyboard
          SizedBox(height: MediaQuery.of(context).viewInsets.bottom + 20),
        ],
      ),
    );
  }

  // Follow-up Chat State
  final List<Map<String, String>> _chatHistory = [];
  bool _isTutorLoading = false;
  final TextEditingController _tutorController = TextEditingController();

  Future<void> _handleFollowUp(String query) async {
    if (query.trim().isEmpty) return;

    setState(() {
      _chatHistory.add({"role": "user", "text": query});
      _isTutorLoading = true;
      _tutorController.clear();
    });

    try {
      final response = await _apiService.askFollowUp(_solution ?? "", query);
      if (mounted) {
        setState(() {
          _chatHistory.add({"role": "ai", "text": response});
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _chatHistory.add({"role": "ai", "text": "Hata: $e"});
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isTutorLoading = false;
        });
      }
    }
  }

  Widget _buildTutorSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.school, color: AppColors.pumpkinPrimary, size: 28),
            const SizedBox(width: 8),
            Text(
              'Anlamadığın yer mi var?',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Chat History
        if (_chatHistory.isNotEmpty)
          ..._chatHistory.map(
            (msg) => Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: msg['role'] == 'user'
                    ? AppColors.pumpkinPrimary.withOpacity(0.1)
                    : (isDark ? Colors.grey[800] : Colors.grey[200]),
                borderRadius: BorderRadius.circular(12),
                border: msg['role'] == 'user'
                    ? Border.all(
                        color: AppColors.pumpkinPrimary.withOpacity(0.3),
                      )
                    : null,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    msg['role'] == 'user' ? 'Sen' : 'Asistan',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: msg['role'] == 'user'
                          ? AppColors.pumpkinPrimary
                          : (isDark ? Colors.grey[400] : Colors.grey[600]),
                    ),
                  ),
                  const SizedBox(height: 4),
                  msg['role'] == 'ai'
                      ? _buildLatexText(
                          msg['text']!,
                          isDark ? Colors.white : Colors.black87,
                        )
                      : Text(
                          msg['text']!,
                          style: TextStyle(
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                ],
              ),
            ),
          ),

        if (_isTutorLoading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8.0),
            child: Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          ),

        // Quick Chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildQuickChip("1. Adımı Açıkla", isDark),
              _buildQuickChip("Alternatif Yol?", isDark),
              _buildQuickChip("Benzer Soru", isDark),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Input Field
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _tutorController,
                style: TextStyle(color: isDark ? Colors.white : Colors.black),
                decoration: InputDecoration(
                  hintText: 'Soru sor...',
                  hintStyle: TextStyle(
                    color: isDark ? Colors.grey[500] : Colors.grey[400],
                  ),
                  filled: true,
                  fillColor: isDark ? Colors.grey[800] : Colors.grey[100],
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
                onSubmitted: _handleFollowUp,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration: const BoxDecoration(
                color: AppColors.pumpkinPrimary,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(Icons.send, color: Colors.white, size: 20),
                onPressed: () => _handleFollowUp(_tutorController.text),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickChip(String text, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ActionChip(
        label: Text(text),
        backgroundColor: isDark ? Colors.grey[800] : Colors.white,
        side: BorderSide(color: isDark ? Colors.grey[700]! : Colors.grey[300]!),
        labelStyle: TextStyle(
          color: isDark ? Colors.white : Colors.black87,
          fontSize: 12,
        ),
        onPressed: () => _handleFollowUp(text),
      ),
    );
  }

  Widget _buildImageCard(bool isDark) {
    return GestureDetector(
      onTap: () {
        showGeneralDialog(
          context: context,
          barrierDismissible: true,
          barrierLabel: 'Close',
          pageBuilder: (context, _, __) {
            return Scaffold(
              backgroundColor: Colors.black,
              appBar: AppBar(
                backgroundColor: Colors.black,
                iconTheme: const IconThemeData(color: Colors.white),
              ),
              body: Center(
                child: InteractiveViewer(
                  child: Image.file(
                    File(widget.imagePath),
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            );
          },
        );
      },
      child: Container(
        height: 120,
        width: double.infinity,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF16213E) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.3 : 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
          image: DecorationImage(
            image: FileImage(File(widget.imagePath)),
            fit: BoxFit.cover,
          ),
        ),
      ),
    );
  }

  Widget _buildSectionBubble(SolutionSection section, int index, bool isDark) {
    final sectionColor = _getSectionColor(section.title);

    // Alternate between different background tints based on section type
    Color bubbleColor;
    if (isDark) {
      bubbleColor = sectionColor.withOpacity(0.15);
    } else {
      // Light mode: use very light tints of the section color
      bubbleColor = Color.lerp(sectionColor, Colors.white, 0.9)!;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bubbleColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: sectionColor.withOpacity(isDark ? 0.3 : 0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Header
          if (section.title.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: sectionColor,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                section.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),

          // Section Content
          ...section.items.map((item) => _buildContentItem(item, isDark)),
        ],
      ),
    );
  }

  Color _getSectionColor(String title) {
    final lowerTitle = title.toLowerCase();

    // Topic
    if (lowerTitle.contains('konu')) return Colors.blue;

    // Given data
    if (lowerTitle.contains('verilen')) return Colors.purple;

    // What's asked
    if (lowerTitle.contains('istenen')) return Colors.indigo;

    // Formulas
    if (lowerTitle.contains('formül')) return Colors.orange;

    // Steps - each step gets a different shade of green/teal
    if (lowerTitle.contains('adım')) {
      // Extract step number
      final stepMatch = RegExp(r'adım\s*(\d+)').firstMatch(lowerTitle);
      if (stepMatch != null) {
        final stepNum = int.tryParse(stepMatch.group(1) ?? '1') ?? 1;
        final stepColors = [
          Colors.teal,
          Colors.cyan,
          Colors.lightBlue,
          Colors.blueGrey,
          Colors.green,
          Colors.lightGreen,
        ];
        return stepColors[(stepNum - 1) % stepColors.length];
      }
      return Colors.teal;
    }

    // Solution/Solving
    if (lowerTitle.contains('çözüm')) return Colors.green;

    // Result/Answer
    if (lowerTitle.contains('cevap') || lowerTitle.contains('sonuç')) {
      return AppColors.pumpkinPrimary;
    }

    // Tip
    if (lowerTitle.contains('ipucu') || lowerTitle.contains('💡')) {
      return Colors.amber;
    }

    return Colors.blueGrey;
  }

  Widget _buildContentItem(String item, bool isDark) {
    final textColor = isDark ? Colors.white : Colors.black87;

    // Check if it's a numbered step
    final stepMatch = RegExp(r'^(\d+)\.\s*(.*)').firstMatch(item);
    if (stepMatch != null) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 24,
              height: 24,
              margin: const EdgeInsets.only(right: 10),
              decoration: const BoxDecoration(
                color: AppColors.pumpkinPrimary,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  stepMatch.group(1)!,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
            Expanded(child: _buildLatexText(stepMatch.group(2)!, textColor)),
          ],
        ),
      );
    }

    // Check if it's a bullet point
    if (item.trim().startsWith('•') || item.trim().startsWith('*')) {
      final text = item.replaceFirst(RegExp(r'^[•*]\s*'), '');
      return Padding(
        padding: const EdgeInsets.only(bottom: 4, left: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 6,
              height: 6,
              margin: const EdgeInsets.only(top: 7, right: 10),
              decoration: BoxDecoration(
                color: isDark ? Colors.grey[400] : Colors.grey,
                shape: BoxShape.circle,
              ),
            ),
            Expanded(child: _buildLatexText(text, textColor)),
          ],
        ),
      );
    }

    // Regular text
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: _buildLatexText(item, textColor),
    );
  }

  Widget _buildLatexText(String text, Color textColor) {
    List<InlineSpan> spans = [];
    final parts = text.split(r'$');

    for (int i = 0; i < parts.length; i++) {
      if (i % 2 == 0) {
        if (parts[i].isNotEmpty) {
          final boldParts = parts[i].split('**');
          for (int j = 0; j < boldParts.length; j++) {
            if (j % 2 == 0) {
              spans.add(TextSpan(text: boldParts[j]));
            } else {
              spans.add(
                TextSpan(
                  text: boldParts[j],
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              );
            }
          }
        }
      } else {
        if (parts[i].isNotEmpty) {
          try {
            spans.add(
              WidgetSpan(
                alignment: PlaceholderAlignment.middle,
                child: Math.tex(
                  parts[i],
                  textStyle: TextStyle(fontSize: 15, color: textColor),
                  onErrorFallback: (err) => Text(
                    '\$${parts[i]}\$',
                    style: const TextStyle(color: Colors.red, fontSize: 14),
                  ),
                ),
              ),
            );
          } catch (e) {
            spans.add(TextSpan(text: '\$${parts[i]}\$'));
          }
        }
      }
    }

    return RichText(
      text: TextSpan(
        style: TextStyle(color: textColor, fontSize: 15, height: 1.6),
        children: spans,
      ),
    );
  }

  List<SolutionSection> _parseSolution(String text) {
    List<SolutionSection> sections = [];
    String currentTitle = '';
    List<String> currentItems = [];

    for (var line in text.split('\n')) {
      if (line.trim().isEmpty) continue;

      // Check for section headers (bold text)
      if (line.startsWith('**') && line.endsWith('**')) {
        if (currentTitle.isNotEmpty || currentItems.isNotEmpty) {
          sections.add(
            SolutionSection(title: currentTitle, items: currentItems),
          );
        }
        currentTitle = line.replaceAll('**', '');
        currentItems = [];
        continue;
      }

      // Add content to current section
      currentItems.add(line);
    }

    // Add last section
    if (currentTitle.isNotEmpty || currentItems.isNotEmpty) {
      sections.add(SolutionSection(title: currentTitle, items: currentItems));
    }

    return sections;
  }
}

class SolutionSection {
  final String title;
  final List<String> items;

  SolutionSection({required this.title, required this.items});
}
