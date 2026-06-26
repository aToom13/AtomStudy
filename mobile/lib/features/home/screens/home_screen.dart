import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_colors.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/features/scanner/screens/crop_screen.dart';
import 'package:mobile/features/scanner/screens/camera_screen.dart';
import 'package:mobile/core/ui/bento_tile.dart';
import 'package:mobile/features/history/screens/history_screen.dart';
import 'package:mobile/features/analysis/screens/analysis_screen.dart';

import 'package:mobile/features/mistakes/screens/mistakes_screen.dart';
import 'package:mobile/features/recommendations/screens/recommendations_screen.dart';
import 'package:mobile/core/services/subscription_service.dart';
import 'package:mobile/features/settings/screens/settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final SubscriptionService _subscriptionService = SubscriptionService();
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initSubscription();
  }

  Future<void> _initSubscription() async {
    await _subscriptionService.init();
    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  void _showQuotaExceededDialog() {
    final plan = _subscriptionService.getPlan();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Günlük Kredi Doldu'),
        content: Text(
          '${plan.name} planında günlük ${plan.dailyQuota} kredi hakkın var. '
          'Daha fazla kredi için planını yükselt!',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tamam'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) =>
                      SettingsScreen(subscriptionService: _subscriptionService),
                ),
              ).then((_) => setState(() {}));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.pumpkinPrimary,
            ),
            child: const Text('Planı Yükselt'),
          ),
        ],
      ),
    );
  }

  Future<void> _openCamera() async {
    if (!_subscriptionService.canAskQuestion()) {
      _showQuotaExceededDialog();
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const CameraScreen()),
    );
  }

  Future<void> _openGallery() async {
    if (!_subscriptionService.canAskQuestion()) {
      _showQuotaExceededDialog();
      return;
    }

    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);

    if (image != null && mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => CropScreen(imagePath: image.path),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final spacing = 12.0;
    final padding = 16.0;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.settings),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) =>
                    SettingsScreen(subscriptionService: _subscriptionService),
              ),
            ).then((_) => setState(() {}));
          },
        ),
        title: const Text('AtomStudy'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const HistoryScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(padding),
          child: Column(
            children: [
              // 1. User Profile Card
              _buildUserProfileCard(),
              SizedBox(height: spacing),

              // 2. Main Scanner Card (Largest)
              _buildScannerCard(),
              SizedBox(height: spacing),

              // 3. Gallery + History Row
              Row(
                children: [
                  Expanded(child: _buildGalleryCard()),
                  SizedBox(width: spacing),
                  Expanded(child: _buildHistoryCard()),
                ],
              ),
              SizedBox(height: spacing),

              // 4. Ad Banner (for plans with home ads)
              if (_subscriptionService.showHomeAds()) ...[
                _buildAdBanner(),
                SizedBox(height: spacing),
              ],

              // 5. Subject Analysis & Recommendations
              _buildAnalysisRow(),
              SizedBox(height: spacing),

              // 6. Mistake Box
              _buildMistakeCard(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUserProfileCard() {
    final usedQuota = _subscriptionService.getUsedQuota();
    final totalQuota = _subscriptionService.getTotalQuota();
    final plan = _subscriptionService.getPlan();

    return BentoTile(
      height: 100,
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: AppColors.pumpkinPrimary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.person,
              color: AppColors.pumpkinPrimary,
              size: 30,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Öğrenci',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: _getPlanColor(plan).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        plan.name,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: _getPlanColor(plan),
                        ),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '$usedQuota/$totalQuota',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                LinearProgressIndicator(
                  value: usedQuota / totalQuota,
                  backgroundColor: Colors.grey[200],
                  color: usedQuota >= totalQuota
                      ? Colors.red
                      : AppColors.pumpkinPrimary,
                  minHeight: 6,
                  borderRadius: BorderRadius.circular(3),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScannerCard() {
    return BentoTile(
      height: 180,
      color: AppColors.pumpkinPrimary,
      onTap: _openCamera,
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.camera_alt_rounded, size: 48, color: Colors.white),
            SizedBox(height: 12),
            Text(
              'Soru Tara',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              'Yapay Zeka ile Çöz',
              style: TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGalleryCard() {
    return BentoTile(
      height: 120,
      title: 'Galeri',
      icon: Icons.photo_library_outlined,
      iconColor: Colors.blue,
      onTap: _openGallery,
      child: const Center(
        child: Icon(
          Icons.add_photo_alternate_outlined,
          size: 32,
          color: Colors.blue,
        ),
      ),
    );
  }

  Widget _buildHistoryCard() {
    return BentoTile(
      height: 120,
      title: 'Geçmiş',
      icon: Icons.history,
      iconColor: Colors.purple,
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const HistoryScreen()),
        );
      },
      child: const Center(
        child: Icon(Icons.folder_open_outlined, size: 32, color: Colors.purple),
      ),
    );
  }

  Widget _buildAdBanner() {
    return BentoTile(
      height: 70,
      color: Colors.grey[100],
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.ad_units, color: Colors.grey[400], size: 24),
          const SizedBox(width: 12),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Reklam Alanı',
                style: TextStyle(
                  color: Colors.grey[600],
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
              Text(
                'Premium\'a geç, reklamsız kullan!',
                style: TextStyle(color: Colors.grey[400], fontSize: 10),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAnalysisRow() {
    return Row(
      children: [
        Expanded(child: _buildAnalysisCardCompact()),
        const SizedBox(width: 12),
        Expanded(child: _buildRecommendationsCard()),
      ],
    );
  }

  Widget _buildAnalysisCardCompact() {
    return BentoTile(
      height: 140,
      title: 'Konu Analizi',
      icon: Icons.pie_chart_outline,
      iconColor: Colors.orange,
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const AnalysisScreen()),
        );
      },
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Zayıf Konu',
            style: TextStyle(fontSize: 11, color: Colors.grey),
          ),
          SizedBox(height: 4),
          Text(
            'Dinamik',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendationsCard() {
    return BentoTile(
      height: 140,
      title: 'Önerilen Dersler',
      icon: Icons.play_lesson_outlined,
      iconColor: Colors.redAccent,
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const RecommendationsScreen(),
          ),
        );
      },
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('Önerilen', style: TextStyle(fontSize: 11, color: Colors.grey)),
          SizedBox(height: 4),
          Text(
            '2 Video',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildMistakeCard() {
    return BentoTile(
      height: 100,
      title: 'Hata Kutusu',
      icon: Icons.inbox_outlined,
      iconColor: Colors.red,
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const MistakesScreen()),
        );
      },
      child: const Center(
        child: Icon(Icons.warning_amber_rounded, color: Colors.red, size: 28),
      ),
    );
  }

  Color _getPlanColor(SubscriptionPlan plan) {
    switch (plan) {
      case SubscriptionPlan.starter:
        return Colors.grey;
      case SubscriptionPlan.basic:
        return Colors.blue;
      case SubscriptionPlan.standard:
        return Colors.green;
      case SubscriptionPlan.premium:
        return Colors.purple;
    }
  }
}
