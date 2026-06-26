import 'package:shared_preferences/shared_preferences.dart';

/// Ad display settings for each plan
enum AdDisplay {
  everywhere, // Ads on home + before solution
  homeOnly, // Ads only on home screen
  none, // No ads
}

/// Credit-based subscription plans
enum SubscriptionPlan {
  starter(
    name: 'Başlangıç',
    dailyQuota: 3,
    price: 'Ücretsiz',
    priceValue: 0,
    adDisplay: AdDisplay.everywhere,
  ),
  basic(
    name: 'Temel',
    dailyQuota: 5,
    price: '₺50/ay',
    priceValue: 50,
    adDisplay: AdDisplay.homeOnly,
  ),
  standard(
    name: 'Standart',
    dailyQuota: 10,
    price: '₺70/ay',
    priceValue: 70,
    adDisplay: AdDisplay.none,
  ),
  premium(
    name: 'Premium',
    dailyQuota: 30,
    price: '₺150/ay',
    priceValue: 150,
    adDisplay: AdDisplay.none,
  );

  final String name;
  final int dailyQuota;
  final String price;
  final int priceValue;
  final AdDisplay adDisplay;

  const SubscriptionPlan({
    required this.name,
    required this.dailyQuota,
    required this.price,
    required this.priceValue,
    required this.adDisplay,
  });
}

/// Subscription service for managing credit-based plans and daily quota.
class SubscriptionService {
  static const String _planKey = 'subscription_plan';
  static const String _usedQuotaKey = 'used_quota';
  static const String _lastUsageDateKey = 'last_usage_date';

  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    await _checkDayRollover();
  }

  /// Check if we need to reset the quota for a new day
  Future<void> _checkDayRollover() async {
    final lastDate = _prefs?.getString(_lastUsageDateKey);
    final today = _getDateString();

    if (lastDate != today) {
      await _prefs?.setInt(_usedQuotaKey, 0);
      await _prefs?.setString(_lastUsageDateKey, today);
    }
  }

  String _getDateString() {
    final now = DateTime.now();
    return '${now.year}-${now.month}-${now.day}';
  }

  /// Get current subscription plan
  SubscriptionPlan getPlan() {
    final planName = _prefs?.getString(_planKey) ?? 'başlangıç';
    return SubscriptionPlan.values.firstWhere(
      (p) => p.name.toLowerCase() == planName.toLowerCase(),
      orElse: () => SubscriptionPlan.starter,
    );
  }

  /// Get used quota for today
  int getUsedQuota() {
    return _prefs?.getInt(_usedQuotaKey) ?? 0;
  }

  /// Get remaining quota for today
  int getRemainingQuota() {
    final plan = getPlan();
    return plan.dailyQuota - getUsedQuota();
  }

  /// Get total quota limit for current plan
  int getTotalQuota() {
    return getPlan().dailyQuota;
  }

  /// Check if user can ask a question
  bool canAskQuestion() {
    return getUsedQuota() < getPlan().dailyQuota;
  }

  /// Use one quota (call after successful question)
  Future<void> useQuota() async {
    final current = getUsedQuota();
    await _prefs?.setInt(_usedQuotaKey, current + 1);
  }

  /// Change subscription plan
  Future<void> changePlan(SubscriptionPlan plan) async {
    await _prefs?.setString(_planKey, plan.name.toLowerCase());
  }

  /// Check if ads should be shown on home screen
  bool showHomeAds() {
    final adDisplay = getPlan().adDisplay;
    return adDisplay == AdDisplay.everywhere || adDisplay == AdDisplay.homeOnly;
  }

  /// Check if ads should be shown before solution
  bool showSolutionAds() {
    return getPlan().adDisplay == AdDisplay.everywhere;
  }

  /// Check if plan has no ads at all
  bool hasNoAds() {
    return getPlan().adDisplay == AdDisplay.none;
  }
}
