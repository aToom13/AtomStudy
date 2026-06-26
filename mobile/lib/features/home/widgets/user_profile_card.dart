import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../core/ui/bento_grid.dart';

class UserProfileCard extends StatelessWidget {
  final String userName;
  final String planName;
  final int usedQuota;
  final int totalQuota;

  const UserProfileCard({
    super.key,
    required this.userName,
    required this.planName,
    required this.usedQuota,
    required this.totalQuota,
  });

  @override
  Widget build(BuildContext context) {
    final double progress = usedQuota / totalQuota;
    final bool isFree = planName.toLowerCase().contains('free');

    return BentoCard(
      crossAxisCellCount: 4,
      mainAxisCellCount: 1,
      color: Colors.white,
      child: Row(
        children: [
          // Avatar
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

          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  userName,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
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
                        color: isFree ? Colors.grey[200] : Colors.amber[100],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        planName,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isFree ? Colors.grey[700] : Colors.amber[900],
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
                  value: progress,
                  backgroundColor: Colors.grey[200],
                  color: progress >= 1.0
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
}
