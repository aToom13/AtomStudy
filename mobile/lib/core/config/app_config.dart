/// AtomStudy application configuration.
///
/// Environment-specific values are centralized here.
/// Override via --dart-define at build time, for example:
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8787
class AppConfig {
  AppConfig._();

  /// Base URL for the backend API.
  ///
  /// - Android Emulator (localhost): http://10.0.2.2:8787
  /// - iOS Simulator (localhost):    http://127.0.0.1:8787
  /// - Production:                   https://your-worker.workers.dev
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://atomstudy-backend.atomstudy25431307.workers.dev',
  );
}
