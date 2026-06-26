import 'package:flutter/material.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';

class BentoGrid extends StatelessWidget {
  final List<Widget> children;
  final int crossAxisCount;
  final double mainAxisSpacing;
  final double crossAxisSpacing;

  const BentoGrid({
    super.key,
    required this.children,
    this.crossAxisCount = 2,
    this.mainAxisSpacing = 16,
    this.crossAxisSpacing = 16,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: StaggeredGrid.count(
        crossAxisCount: crossAxisCount,
        mainAxisSpacing: mainAxisSpacing,
        crossAxisSpacing: crossAxisSpacing,
        children: children,
      ),
    );
  }
}

class BentoCard extends StatelessWidget {
  final Widget child;
  final int crossAxisCellCount;
  final int mainAxisCellCount;
  final Color? color;
  final VoidCallback? onTap;
  final String? title;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;

  const BentoCard({
    super.key,
    required this.child,
    this.crossAxisCellCount = 1,
    this.mainAxisCellCount = 1,
    this.color,
    this.onTap,
    this.title,
    this.subtitle,
    this.icon,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return StaggeredGridTile.count(
      crossAxisCellCount: crossAxisCellCount,
      mainAxisCellCount: mainAxisCellCount,
      child: Material(
        color: color ?? Colors.white,
        borderRadius: BorderRadius.circular(24),
        elevation: 2,
        shadowColor: Colors.black.withOpacity(0.1),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(24),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (icon != null || title != null)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (icon != null)
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: (iconColor ?? Colors.black).withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            icon,
                            color: iconColor ?? Colors.black,
                            size: 20,
                          ),
                        ),
                      if (title != null)
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.only(left: 8.0),
                            child: Text(
                              title!,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                    ],
                  ),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitle!,
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                ],
                if (icon != null || title != null || subtitle != null)
                  const SizedBox(height: 12),
                Expanded(child: child),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
