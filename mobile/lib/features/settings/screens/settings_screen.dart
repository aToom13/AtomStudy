import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_colors.dart';
import 'package:mobile/core/services/subscription_service.dart';

class SettingsScreen extends StatefulWidget {
  final SubscriptionService subscriptionService;

  const SettingsScreen({super.key, required this.subscriptionService});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late SubscriptionPlan _currentPlan;

  @override
  void initState() {
    super.initState();
    _currentPlan = widget.subscriptionService.getPlan();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final usedQuota = widget.subscriptionService.getUsedQuota();
    final totalQuota = widget.subscriptionService.getTotalQuota();

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF1A1A2E) : Colors.grey[100],
      appBar: AppBar(
        title: const Text('Ayarlar'),
        backgroundColor: AppColors.pumpkinPrimary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Current Usage Card
            _buildUsageCard(isDark, usedQuota, totalQuota),
            const SizedBox(height: 24),

            // Plan Selection
            Text(
              'Abonelik Planı Seç',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 12),

            ...SubscriptionPlan.values.map(
              (plan) => _buildPlanCard(plan, isDark),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUsageCard(bool isDark, int used, int total) {
    final progress = used / total;
    final isExceeded = used >= total;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isExceeded
              ? [Colors.red.shade400, Colors.red.shade700]
              : [AppColors.pumpkinPrimary, AppColors.pumpkinDark],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    '$used',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Bugünkü Kullanım',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$used / $total Kredi',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          LinearProgressIndicator(
            value: progress.clamp(0.0, 1.0),
            backgroundColor: Colors.white.withOpacity(0.3),
            color: Colors.white,
            minHeight: 8,
            borderRadius: BorderRadius.circular(4),
          ),
          const SizedBox(height: 8),
          Text(
            isExceeded
                ? 'Günlük limit doldu! Yarın sıfırlanacak.'
                : '${total - used} kredi kaldı',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildPlanCard(SubscriptionPlan plan, bool isDark) {
    final isSelected = plan == _currentPlan;
    final isUnlimited = plan.dailyQuota >= 999;

    return GestureDetector(
      onTap: () async {
        await widget.subscriptionService.changePlan(plan);
        setState(() => _currentPlan = plan);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${plan.name} planına geçildi!')),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.pumpkinPrimary.withOpacity(isDark ? 0.3 : 0.1)
              : (isDark ? const Color(0xFF1E1E2E) : Colors.white),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppColors.pumpkinPrimary : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            // Plan Icon
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: _getPlanColor(plan).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                isUnlimited ? Icons.all_inclusive : Icons.bolt,
                color: _getPlanColor(plan),
              ),
            ),
            const SizedBox(width: 16),

            // Plan Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        plan.name,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                      if (isSelected) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.green,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'Aktif',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isUnlimited
                        ? 'Sınırsız günlük kredi'
                        : 'Günde ${plan.dailyQuota} kredi',
                    style: TextStyle(
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            // Price
            Text(
              plan.price,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: _getPlanColor(plan),
              ),
            ),
          ],
        ),
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
