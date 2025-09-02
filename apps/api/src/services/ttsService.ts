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
  private readonly tempDir: string;
  private readonly userUploadsDir: string;
  private readonly presetsDir: string;
  private readonly presetsPath: string;
  private readonly userUploadsPath: string;

  constructor() {
    this.xttsBaseUrl = process.env.XTTS_API_URL || 'http://localhost:8020';
    this.outputDir = process.env.TTS_OUTPUT_DIR || './xtts-data/output';
    this.speakersDir = process.env.TTS_SPEAKERS_DIR || './xtts-data/speakers';
    
    // Derived paths
    this.tempDir = path.join(this.outputDir, 'temp');
    this.userUploadsDir = path.join(this.speakersDir, 'user-uploads');
    this.presetsDir = path.join(this.speakersDir, 'presets');
    
    // API paths
    this.presetsPath = '/app/speakers/presets';
    this.userUploadsPath = '/app/speakers/user-uploads';
  }

  // Voice presets management
  public getVoicePresets(): VoicePreset[] {
    const presets: VoicePreset[] = [
      {
        id: 'josh',
        name: 'Josh',
        description: 'American, male, Pittsburgh, Pennsylvania, USA',
        filePath: `${this.presetsPath}/josh.wav`
      },
      {
        id: 'emily',
        name: 'Emily',
        description: 'British, female, Birmingham, UK',
        filePath: `${this.presetsPath}/emily.wav`
      },
      {
        id: 'liam',
        name: 'Liam',
        description: 'Australian, male, Brisbane, Australia',
        filePath: `${this.presetsPath}/liam.wav`
      },
      {
        id: 'mariah',
        name: 'Mariah',
        description: 'Jamaican, female, Saint Anne\'s Bay, Jamaica',
        filePath: `${this.presetsPath}/mariah.wav`
      },
      {
        id: 'daniel',
        name: 'Daniel',
        description: 'American, male, Fairfax, Virginia, USA',
        filePath: `${this.presetsPath}/daniel.wav`
      },
      {
        id: 'jessica',
        name: 'Jessica',
        description: 'American, female, Brooklyn, New York, USA',
        filePath: `${this.presetsPath}/jessica.wav`
      },
      {
        id: 'marcus',
        name: 'Marcus',
        description: 'American, male, Macon, Mississippi, USA',
        filePath: `${this.presetsPath}/marcus.wav`
      },
      {
        id: 'chloe',
        name: 'Chloe',
        description: 'Australian, female, Perth, Australia',
        filePath: `${this.presetsPath}/chloe.wav`
      },
      {
        id: 'sarah',
        name: 'Sarah',
        description: 'American, female, Carthage, Texas, USA',
        filePath: `${this.presetsPath}/sarah.wav`
      },
      {
        id: 'hannah',
        name: 'Hannah',
        description: 'American, female, Davenport, Iowa, USA',
        filePath: `${this.presetsPath}/hannah.wav`
      },
      {
        id: 'sophie',
        name: 'Sophie',
        description: 'British, female, Staffordshire, UK',
        filePath: `${this.presetsPath}/sophie.wav`
      },
      {
        id: 'lucy',
        name: 'Lucy',
        description: 'British, female, Leicester, UK',
        filePath: `${this.presetsPath}/lucy.wav`
      },
      {
        id: 'oliver',
        name: 'Oliver',
        description: 'British, male, Henley-on-Thames, Oxfordshire, UK',
        filePath: `${this.presetsPath}/oliver.wav`
      },
      {
        id: 'connor',
        name: 'Connor',
        description: 'Northern Irish, male, Belfast, Northern Ireland, UK',
        filePath: `${this.presetsPath}/connor.wav`
      },
      {
        id: 'madison',
        name: 'Madison',
        description: 'American, female, Norton, Virginia, USA',
        filePath: `${this.presetsPath}/madison.wav`
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
      const outputPath = path.join(this.tempDir, filename);
      
      fs.writeFileSync(outputPath, response.data);

      // Get file metadata
      const stats = fs.statSync(outputPath);
      
      return {
        success: true,
        audioUrl: `/api/tts/audio/${filename}`,
        metadata: {
          duration: 0,
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

  // Generate speech with uploaded voice file (temporary, no persistent storage)
  public async generateSpeechWithUploadedVoice(
    text: string,
    voiceBuffer: Buffer,
    language: string = 'en'
  ): Promise<TTSResponse> {
    let tempVoiceFile: string | null = null;
    
    try {
      // Create temporary voice file
      const tempFilename = `temp_voice_${uuidv4()}.wav`;
      tempVoiceFile = path.join(this.tempDir, tempFilename);
      
      // Ensure temp directory exists
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      
      // Save uploaded voice to temp file
      fs.writeFileSync(tempVoiceFile, voiceBuffer);

      // Generate TTS using the temp voice file - use container path
      const xttsRequest: XTTSApiRequest = {
        text,
        speaker_wav: `/app/xtts-data/output/temp/${tempFilename}`, // Simple container path
        language
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

      // Save the generated audio file
      const outputFilename = `tts_${uuidv4()}.wav`;
      const outputPath = path.join(this.tempDir, outputFilename);
      
      fs.writeFileSync(outputPath, response.data);

      // Get file metadata
      const stats = fs.statSync(outputPath);
      
      return {
        success: true,
        audioUrl: `/api/tts/audio/${outputFilename}`,
        metadata: {
          duration: 0,
          fileSize: stats.size,
          format: 'wav'
        }
      };

    } catch (error: any) {
      console.error('TTS Generation with Uploaded Voice Error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'TTS generation with uploaded voice failed'
      };
    } finally {
      // Always clean up the temporary voice file
      if (tempVoiceFile && fs.existsSync(tempVoiceFile)) {
        try {
          fs.unlinkSync(tempVoiceFile);
          console.log(`Cleaned up temporary voice file: ${tempVoiceFile}`);
        } catch (cleanupError) {
          console.error(`Failed to cleanup temporary voice file: ${tempVoiceFile}`, cleanupError);
        }
      }
    }
  }

  // Audio file serving
  public getAudioFile(filename: string): Buffer | null {
    const filePath = path.join(this.tempDir, filename);
    
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    
    return null;
  }

  // Cleanup temporary files
  public cleanupTempFiles(olderThanMinutes: number = 60): void {
    const cutoffTime = Date.now() - (olderThanMinutes * 60 * 1000);

    if (!fs.existsSync(this.tempDir)) return;

    const files = fs.readdirSync(this.tempDir);
    
    files.forEach(file => {
      const filePath = path.join(this.tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime.getTime() < cutoffTime) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up temp file: ${file}`);
      }
    });
  }
}

// Export singleton instance
export const ttsService = new TTSService();