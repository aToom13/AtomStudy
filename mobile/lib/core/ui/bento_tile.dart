import 'package:flutter/material.dart';

/// A simple, rounded card for the Bento-style dashboard.
/// Automatically adapts to the current theme (light/dark mode).
class BentoTile extends StatelessWidget {
  final Widget child;
  final Color? color;
  final VoidCallback? onTap;
  final String? title;
  final IconData? icon;
  final Color? iconColor;
  final double? height;

  const BentoTile({
    super.key,
    required this.child,
    this.color,
    this.onTap,
    this.title,
    this.icon,
    this.iconColor,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Theme-aware colors
    final defaultColor = isDark ? const Color(0xFF1E1E2E) : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black;
    final subtitleColor = isDark ? Colors.grey[400] : Colors.grey[600];
    final shadowColor = isDark
        ? Colors.black.withOpacity(0.3)
        : Colors.black.withOpacity(0.1);

    return SizedBox(
      height: height,
      child: Material(
        color: color ?? defaultColor,
        borderRadius: BorderRadius.circular(24),
        elevation: isDark ? 4 : 2,
        shadowColor: shadowColor,
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
                    children: [
                      if (icon != null)
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: (iconColor ?? textColor).withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            icon,
                            color: iconColor ?? textColor,
                            size: 20,
                          ),
                        ),
                      if (icon != null && title != null)
                        const SizedBox(width: 8),
                      if (title != null)
                        Expanded(
                          child: Text(
                            title!,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: iconColor ?? subtitleColor,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                  ),
                if (icon != null || title != null) const SizedBox(height: 8),
                Expanded(child: child),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
