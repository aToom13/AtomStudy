import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/home/screens/home_screen.dart';

import 'package:firebase_core/firebase_core.dart';

// If firebase_options.dart is missing, we can use manual initialization or just Firebase.initializeApp() for Android if google-services.json is present.

import 'dart:io';
import 'package:flutter/foundation.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase is not supported on Linux Desktop. Only initialize on supported platforms.
  if (!kIsWeb && (Platform.isAndroid || Platform.isIOS || Platform.isMacOS)) {
    await Firebase.initializeApp();
  }

  runApp(const AtomStudyApp());
}

class AtomStudyApp extends StatelessWidget {
  const AtomStudyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AtomStudy',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const HomeScreen(),
    );
  }
}
