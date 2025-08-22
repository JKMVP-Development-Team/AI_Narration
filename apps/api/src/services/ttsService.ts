import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  XTTSApiRequest, 
  XTTSApiResponse, 
  VoicePreset, 
  TTSRequest, 
  TTSResponse,
  VoiceTrainingRequest,
  VoiceTrainingResponse 
} from '@shared/types/tts';

export class TTSService {
  private readonly xttsBaseUrl: string;
  private readonly outputDir: string;
  private readonly speakersDir: string;

  constructor() {
    this.xttsBaseUrl = process.env.XTTS_API_URL || 'http://localhost:8020';
    this.outputDir = process.env.TTS_OUTPUT_DIR || './xtts-data/output';
    this.speakersDir = process.env.TTS_SPEAKERS_DIR || './xtts-data/speakers';
  }


  // Voice presets management
  public getVoicePresets(): VoicePreset[] {
    const presets: VoicePreset[] = [
      {
        id: 'hawking',
        name: 'Stephen Hawking',
        description: 'Renowned theoretical physicist',
        filePath: '/app/speakers/presets/hawking01.wav'
      },
      {
        id: 'eastwood',
        name: 'Clint Eastwood',
        description: 'Iconic actor and director',
        filePath: '/app/speakers/presets/eastwood_lawyers.wav'
      },
      {
        id: 'manson',
        name: 'Charles Manson',
        description: 'Historical figure voice',
        filePath: '/app/speakers/presets/manson_believe_me.wav'
      }
    ];

    return presets;
  }

  public getVoicePresetById(id: string): VoicePreset | null {
    const presets = this.getVoicePresets();
    return presets.find(preset => preset.id === id) || null;
  }

  // Main TTS generation
  public async generateSpeech(request: TTSRequest): Promise<TTSResponse> {
    try {
      let speakerWavPath: string;

      if (request.voicePreset) {
        const preset = this.getVoicePresetById(request.voicePreset);
        if (!preset) {
          return {
            success: false,
            error: `Voice preset '${request.voicePreset}' not found`
          };
        }
        speakerWavPath = preset.filePath;
      } else if (request.customVoiceFile) {
        speakerWavPath = request.customVoiceFile;
      } else {
        return {
          success: false,
          error: 'Either voicePreset or customVoiceFile must be provided'
        };
      }

      const xttsRequest: XTTSApiRequest = {
        text: request.text,
        speaker_wav: speakerWavPath,
        language: request.language || 'en'
      };

      const response = await axios.post(
        `${this.xttsBaseUrl}/tts_to_audio/`,
        xttsRequest,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      // Save the audio file
      const filename = `tts_${uuidv4()}.wav`;
      const outputPath = path.join(this.outputDir, 'temp', filename);
      
      fs.writeFileSync(outputPath, response.data);

      // Get file metadata
      const stats = fs.statSync(outputPath);
      
      return {
        success: true,
        audioUrl: `/api/tts/audio/${filename}`,
        metadata: {
          duration: 0, // You could calculate this if needed
          fileSize: stats.size,
          format: 'wav'
        }
      };

    } catch (error: any) {
      console.error('TTS Generation Error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'TTS generation failed'
      };
    }
  }

  
}

// Export singleton instance
export const ttsService = new TTSService();