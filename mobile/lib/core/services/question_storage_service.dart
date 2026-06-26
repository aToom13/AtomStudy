import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Model for a solved question
class SolvedQuestion {
  final String id;
  final String imagePath;
  final String topic;
  final String solution;
  final bool isCorrect;
  final DateTime solvedAt;

  SolvedQuestion({
    required this.id,
    required this.imagePath,
    required this.topic,
    required this.solution,
    required this.isCorrect,
    required this.solvedAt,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'imagePath': imagePath,
    'topic': topic,
    'solution': solution,
    'isCorrect': isCorrect,
    'solvedAt': solvedAt.toIso8601String(),
  };

  factory SolvedQuestion.fromJson(Map<String, dynamic> json) => SolvedQuestion(
    id: json['id'],
    imagePath: json['imagePath'],
    topic: json['topic'],
    solution: json['solution'],
    isCorrect: json['isCorrect'],
    solvedAt: DateTime.parse(json['solvedAt']),
  );
}

/// Service for storing and retrieving solved questions
class QuestionStorageService {
  static const String _questionsKey = 'solved_questions';
  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  /// Save a new solved question
  Future<void> saveQuestion(SolvedQuestion question) async {
    final questions = await getQuestions();
    questions.insert(0, question); // Add to beginning

    // Keep only last 100 questions
    if (questions.length > 100) {
      questions.removeRange(100, questions.length);
    }

    final jsonList = questions.map((q) => q.toJson()).toList();
    await _prefs?.setString(_questionsKey, jsonEncode(jsonList));
  }

  /// Get all solved questions
  Future<List<SolvedQuestion>> getQuestions() async {
    final jsonString = _prefs?.getString(_questionsKey);
    if (jsonString == null) return [];

    final List<dynamic> jsonList = jsonDecode(jsonString);
    return jsonList.map((j) => SolvedQuestion.fromJson(j)).toList();
  }

  /// Get only incorrect questions (for mistakes/retry)
  Future<List<SolvedQuestion>> getMistakes() async {
    final questions = await getQuestions();
    return questions.where((q) => !q.isCorrect).toList();
  }

  /// Get questions by topic (for analysis)
  Future<Map<String, List<SolvedQuestion>>> getByTopic() async {
    final questions = await getQuestions();
    final Map<String, List<SolvedQuestion>> byTopic = {};

    for (final q in questions) {
      byTopic.putIfAbsent(q.topic, () => []).add(q);
    }

    return byTopic;
  }

  /// Get topic statistics
  Future<Map<String, double>> getTopicStats() async {
    final byTopic = await getByTopic();
    final Map<String, double> stats = {};

    for (final entry in byTopic.entries) {
      final correct = entry.value.where((q) => q.isCorrect).length;
      final total = entry.value.length;
      stats[entry.key] = total > 0 ? correct / total : 0.0;
    }

    return stats;
  }

  /// Mark a question as correct (after retry)
  Future<void> markAsCorrect(String questionId) async {
    final questions = await getQuestions();
    final index = questions.indexWhere((q) => q.id == questionId);

    if (index != -1) {
      final old = questions[index];
      questions[index] = SolvedQuestion(
        id: old.id,
        imagePath: old.imagePath,
        topic: old.topic,
        solution: old.solution,
        isCorrect: true,
        solvedAt: old.solvedAt,
      );

      final jsonList = questions.map((q) => q.toJson()).toList();
      await _prefs?.setString(_questionsKey, jsonEncode(jsonList));
    }
  }

  /// Clear all questions
  Future<void> clear() async {
    await _prefs?.remove(_questionsKey);
  }
}
