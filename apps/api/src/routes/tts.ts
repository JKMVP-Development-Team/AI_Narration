import { Router, Request, Response } from 'express';
import multer, {FileFilterCallback} from 'multer';
import { ttsService } from '../services/ttsService';
import { 
  TTSRequest, 
  VoiceTrainingRequest, 
  ApiResponse 
} from '@shared/types/tts';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept only audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Get all voice presets
router.get('/presets', async (req: Request, res: Response) => {
  try {
    const presets = ttsService.getVoicePresets();
    
    const response: ApiResponse = {
      success: true,
      data: presets,
      message: 'Voice presets retrieved successfully'
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to retrieve voice presets'
    };
    res.status(500).json(response);
  }
});

// Get specific voice preset
router.get('/presets/:id', async (req: Request, res: Response) => {
  try 
  {
    const { id } = req.params;
    const preset = ttsService.getVoicePresetById(id);
    
    if (!preset) {
      const response: ApiResponse = {
        success: false,
        error: `Voice preset '${id}' not found`
      };
      return res.status(404).json(response);
    }
    
    const response: ApiResponse = {
      success: true,
      data: preset,
      message: 'Voice preset retrieved successfully'
    };
    
    res.json(response);

  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to retrieve voice preset'
    };
    res.status(500).json(response);
  }
});

// Generate speech with preset
router.post('/speak', async (req: Request, res: Response) => {
  try {
    const ttsRequest: TTSRequest = req.body;
    
    // Validate required fields
    if (!ttsRequest.text) {
      const response: ApiResponse = {
        success: false,
        error: 'Text is required'
      };
      return res.status(400).json(response);
    }

    if (!ttsRequest.voicePreset && !ttsRequest.customVoiceFile) {
      const response: ApiResponse = {
        success: false,
        error: 'Either voicePreset or customVoiceFile must be provided'
      };
      return res.status(400).json(response);
    }

    const result = await ttsService.generateSpeech(ttsRequest);
    
    if (result.success) {
      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Speech generated successfully'
      };
      res.json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: result.error || 'Speech generation failed'
      };
      res.status(500).json(response);
    }
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Speech generation failed'
    };
    res.status(500).json(response);
  }
});

// Generate speech with uploaded voice
router.post('/speak-custom', async (req: Request, res: Response) => {
  try {
    const { text, userId, voiceId, language = 'en' } = req.body;
    
    if (!text || !userId || !voiceId) {
      const response: ApiResponse = {
        success: false,
        error: 'text, userId, and voiceId are required'
      };
      return res.status(400).json(response);
    }

    const customVoiceFile = `/app/speakers/user-uploads/${userId}_${voiceId}.wav`;
    
    const ttsRequest: TTSRequest = {
      text,
      customVoiceFile,
      language
    };

    const result = await ttsService.generateSpeech(ttsRequest);
    
    if (result.success) {
      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Speech generated with custom voice successfully'
      };
      res.json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: result.error || 'Custom speech generation failed'
      };
      res.status(500).json(response);
    }
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Custom speech generation failed'
    };
    res.status(500).json(response);
  }
});

// Serve generated audio files
router.get('/audio/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent directory traversal
    if (!/^[a-zA-Z0-9_-]+\.(wav|mp3)$/.test(filename)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }

    const audioBuffer = ttsService.getAudioFile(filename);
    
    if (!audioBuffer) {
      return res.status(404).json({
        success: false,
        error: 'Audio file not found'
      });
    }

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    res.send(audioBuffer);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to serve audio file'
    };
    res.status(500).json(response);
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'TTS service is healthy',
    timestamp: new Date().toISOString()
  });
});

// Cleanup temporary files (admin endpoint)
router.post('/admin/cleanup', async (req: Request, res: Response) => {
  try {
    const { olderThanMinutes = 60 } = req.body;
    
    ttsService.cleanupTempFiles(olderThanMinutes);
    
    const response: ApiResponse = {
      success: true,
      message: `Cleaned up temporary files older than ${olderThanMinutes} minutes`
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Cleanup failed'
    };
    res.status(500).json(response);
  }
});

export { router as ttsRoutes };