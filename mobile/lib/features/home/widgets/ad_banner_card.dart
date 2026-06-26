import 'package:flutter/material.dart';
import '../../../core/ui/bento_grid.dart';

class AdBannerCard extends StatelessWidget {
  const AdBannerCard({super.key});

  @override
  Widget build(BuildContext context) {
    return BentoCard(
      crossAxisCellCount: 4,
      mainAxisCellCount: 1,
      color: Colors.grey[100],
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.ad_units, color: Colors.grey[400], size: 32),
            const SizedBox(height: 8),
            Text(
              'Reklam Alanı',
              style: TextStyle(
                color: Colors.grey[500],
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              'Premium\'a geç, reklamsız kullan!',
              style: TextStyle(color: Colors.grey[400], fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }
}
