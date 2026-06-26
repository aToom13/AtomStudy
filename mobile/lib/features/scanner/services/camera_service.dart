import 'package:camera/camera.dart';

class CameraService {
  static final CameraService _instance = CameraService._internal();

  factory CameraService() {
    return _instance;
  }

  CameraService._internal();

  CameraController? _controller;
  List<CameraDescription>? _cameras;

  CameraController? get controller => _controller;

  Future<void> initialize() async {
    if (_controller != null) return;

    _cameras = await availableCameras();
    if (_cameras == null || _cameras!.isEmpty) {
      throw Exception('No cameras found');
    }

    // Use the first available camera (usually back camera on mobile, webcam on Linux)
    _controller = CameraController(
      _cameras![0],
      ResolutionPreset.high,
      enableAudio: false,
    );

    await _controller!.initialize();
  }

  Future<void> dispose() async {
    await _controller?.dispose();
    _controller = null;
  }

  Future<XFile> takePicture() async {
    if (_controller == null || !_controller!.value.isInitialized) {
      throw Exception('Camera not initialized');
    }
    return await _controller!.takePicture();
  }
}
