import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/core/config/app_config.dart';

class ApiService {
  final String _baseUrl = AppConfig.apiBaseUrl;

  Future<String> solveQuestion(String base64Image) async {
    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/solve"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"image": base64Image}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['solution'];
      } else {
        return "Hata oluştu: ${response.statusCode} - ${response.body}";
      }
    } catch (e) {
      return "Bağlantı hatası: $e";
    }
  }

  Future<String> generateQuiz(String topic, int count) async {
    try {
      // TODO: Update endpoint when backend is ready
      // final response = await http.post(
      //   Uri.parse("$_baseUrl/quiz"),
      //   headers: {"Content-Type": "application/json"},
      //   body: jsonEncode({
      //     "topic": topic,
      //     "count": count,
      //   }),
      // );

      // Mock response for now
      await Future.delayed(const Duration(seconds: 2));
      return """
**Test: $topic**

1. Soru 1: ...
A) ...
B) ...
C) ...
D) ...
E) ...
Cevap: A

2. Soru 2: ...
...
""";
    } catch (e) {
      return "Test oluşturulamadı: $e";
    }
  }

  Future<String> analyzePerformance(Map<String, double> stats) async {
    try {
      // Mock AI Analysis
      await Future.delayed(const Duration(seconds: 2));

      // Determine weakest and strongest topics
      if (stats.isEmpty) return "Analiz için yeterli veri yok.";

      final sorted = stats.entries.toList()
        ..sort((a, b) => a.value.compareTo(b.value));

      final weakest = sorted.first;
      final strongest = sorted.last;

      return """
**Performans Özeti**
Genel durumun gayet iyi görünüyor ancak bazı konulara odaklanmalısın.

**Güçlü Yönlerin**
💪 ${strongest.key}: Bu konuda oldukça başarılısın! (${(strongest.value * 100).toInt()}%)

**Gelişim Alanları**
🎯 ${weakest.key}: Bu konuda daha fazla pratik yapman gerekebilir. (${(weakest.value * 100).toInt()}%)

**Öneriler**
1. ${weakest.key} konusunda temel kavramları tekrar et.
2. Hata yaptığın soruları Hata Kutusu'ndan tekrar çöz.
3. Haftada en az 2 test çözerek hızını artır.
""";
    } catch (e) {
      return "Analiz yapılamadı: $e";
    }
  }

  Future<String> askFollowUp(String context, String query) async {
    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/chat"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"context": context, "query": query}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['answer'] ?? "Cevap alınamadı.";
      } else {
        return "Hata: ${response.statusCode}";
      }
    } catch (e) {
      return "Bağlantı hatası: $e";
    }
  }

  Future<List<Map<String, String>>> getRecommendedVideos(
    String lesson,
    String topic,
  ) async {
    final query = '$lesson $topic soru çözümü';
    return await searchYoutubeVideos(query);
  }

  Future<List<Map<String, String>>> searchYoutubeVideos(String query) async {
    try {
      // SECURE: Call our Cloudflare Worker Proxy instead of direct YouTube API
      // The API Key is now hidden on the server side (Cloudflare)
      final url = Uri.parse('$_baseUrl/search-videos?q=$query');

      final response = await http.get(
        url,
        headers: {
          "Content-Type": "application/json",
          // "Authorization": "Bearer $userToken" // If we add auth later
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        // Handle Cloudflare/Proxy errors that return 200 JSON with error field
        if (data['error'] != null) {
          print('Proxy Error: ${data['error']}');
          return _getErrorVideo("Sunucu Hatası", "Lütfen tekrar deneyin.");
        }

        final items = data['items'] as List?;
        if (items == null || items.isEmpty) {
          return _getErrorVideo("Sonuç Bulunamadı", "Farklı bir arama yapın.");
        }

        return items.map<Map<String, String>>((item) {
          final snippet = item['snippet'];
          final videoId = item['id']['videoId'];
          return {
            "title": snippet['title'] ?? "",
            "channel": snippet['channelTitle'] ?? "",
            "duration": "Video",
            "url": "https://www.youtube.com/watch?v=$videoId",
            "thumbnail": snippet['thumbnails']['medium']['url'] ?? "",
            "lesson": "YouTube",
            "topic": "Search",
          };
        }).toList();
      } else {
        print('Backend Error: ${response.statusCode} ${response.body}');
        return _getErrorVideo(
          "Bağlantı Hatası",
          "Sunucuya ulaşılamadı (${response.statusCode})",
        );
      }
    } catch (e) {
      print('Network Error: $e');
      return _getErrorVideo("Ağ Hatası", "İnternet bağlantınızı kontrol edin.");
    }
  }

  List<Map<String, String>> _getErrorVideo(String title, String channel) {
    return [
      {
        "title": title,
        "channel": channel,
        "duration": "!",
        "url": "",
        "thumbnail": "",
        "lesson": "Sistem",
        "topic": "Hata",
      },
    ];
  }
}
