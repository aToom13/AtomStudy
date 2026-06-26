import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';
import '../../../../core/theme/app_colors.dart';
import '../../solution/screens/solution_screen.dart';

class CropScreen extends StatefulWidget {
  final String imagePath;

  const CropScreen({super.key, required this.imagePath});

  @override
  State<CropScreen> createState() => _CropScreenState();
}

class _CropScreenState extends State<CropScreen> {
  CroppedFile? _croppedFile;

  @override
  void initState() {
    super.initState();
    _cropImage();
  }

  Future<void> _cropImage() async {
    if (Platform.isLinux) {
      // ImageCropper doesn't support Linux out of the box.
      // For testing, we bypass cropping and just use the original image.
      setState(() {
        _croppedFile = CroppedFile(widget.imagePath);
      });
      return;
    }

    final croppedFile = await ImageCropper().cropImage(
      sourcePath: widget.imagePath,
      uiSettings: [
        AndroidUiSettings(
          toolbarTitle: 'Soruyu Kırp',
          toolbarColor: AppColors.pumpkinPrimary,
          toolbarWidgetColor: Colors.white,
          initAspectRatio: CropAspectRatioPreset.original,
          lockAspectRatio: false,
        ),
        IOSUiSettings(title: 'Soruyu Kırp'),
        WebUiSettings(context: context),
      ],
    );

    if (croppedFile != null) {
      setState(() {
        _croppedFile = croppedFile;
      });
    } else {
      // User cancelled cropping, go back
      if (mounted) Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kırpılan Soru'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: () {
              if (_croppedFile != null) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) =>
                        SolutionScreen(imagePath: _croppedFile!.path),
                  ),
                );
              }
            },
          ),
        ],
      ),
      body: Center(
        child: _croppedFile != null
            ? Image.file(File(_croppedFile!.path))
            : const CircularProgressIndicator(),
      ),
    );
  }
}
