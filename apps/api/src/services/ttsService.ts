import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
    this.presetsPath = '/app/xtts-data/speakers/presets';
    this.userUploadsPath = '/app/xtts-data/speakers/user-uploads';
  }

  // Generate cache key for audio caching
  private generateCacheKey(text: string, voiceId: string, language: string): string {
    const content = `${text.trim()}|${voiceId}|${language}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Check if cached audio file exists
  private getCachedAudioPath(cacheKey: string): string {
    return path.join(this.tempDir, `cached_${cacheKey}.wav`);
  }

  // Voice presets management
  public getVoicePresets(): VoicePreset[] {
    const presetData = [
      { id: 'josh', name: 'Josh', description: 'American, male, Pittsburgh, Pennsylvania, USA' },
      { id: 'emily', name: 'Emily', description: 'British, female, Birmingham, UK' },
      { id: 'liam', name: 'Liam', description: 'Australian, male, Brisbane, Australia' },
      { id: 'mariah', name: 'Mariah', description: 'Jamaican, female, Saint Anne\'s Bay, Jamaica' },
      { id: 'daniel', name: 'Daniel', description: 'American, male, Fairfax, Virginia, USA' },
      { id: 'jessica', name: 'Jessica', description: 'American, female, Brooklyn, New York, USA' },
      { id: 'marcus', name: 'Marcus', description: 'American, male, Macon, Mississippi, USA' },
      { id: 'chloe', name: 'Chloe', description: 'Australian, female, Perth, Australia' },
      { id: 'sarah', name: 'Sarah', description: 'American, female, Carthage, Texas, USA' },
      { id: 'hannah', name: 'Hannah', description: 'American, female, Davenport, Iowa, USA' },
      { id: 'sophie', name: 'Sophie', description: 'British, female, Staffordshire, UK' },
      { id: 'lucy', name: 'Lucy', description: 'British, female, Leicester, UK' },
      { id: 'oliver', name: 'Oliver', description: 'British, male, Henley-on-Thames, Oxfordshire, UK' },
      { id: 'connor', name: 'Connor', description: 'Northern Irish, male, Belfast, Northern Ireland, UK' },
      { id: 'madison', name: 'Madison', description: 'American, female, Norton, Virginia, USA' },
    ];
    
    // Map over the data to add the correct, dynamic filePath for the container
    return presetData.map(p => ({
      ...p,
      // This assumes your preset audio files are named like 'Sarah.wav', 'Josh.wav', etc.
      filePath: `${this.presetsPath}/${p.name}.wav`
    }));
  }

  public getVoicePresetById(id: string): VoicePreset | null {
    const presets = this.getVoicePresets();
    return presets.find(preset => preset.id === id) || null;
  }

  // Main TTS generation
  public async generateSpeech(request: TTSRequest): Promise<TTSResponse> {
    try {
      let speakerWavPath: string;
      let voiceId: string;

      if (request.voicePreset) {
        const preset = this.getVoicePresetById(request.voicePreset);
        if (!preset) {
          return {
            success: false,
            error: `Voice preset '${request.voicePreset}' not found`
          };
        }

        speakerWavPath = preset.filePath;
        voiceId = request.voicePreset;

      } else if (request.customVoiceFile) {
        speakerWavPath = request.customVoiceFile;
        voiceId = 'custom';
      } else {
        return {
          success: false,
          error: 'Either voicePreset or customVoiceFile must be provided'
        };
      }

      // Generate cache key and check for existing cached file
      const cacheKey = this.generateCacheKey(request.text, voiceId, request.language || 'en');
      const cachedFilePath = this.getCachedAudioPath(cacheKey);
      const filename = `cached_${cacheKey}.wav`;

      // Check if cached file exists
      if (fs.existsSync(cachedFilePath)) {
        console.log(`Cache hit for key: ${cacheKey}`);
        const stats = fs.statSync(cachedFilePath);
        
        return {
          success: true,
          audioUrl: `/api/tts/audio/${filename}`,
          metadata: {
            duration: 0,
            fileSize: stats.size,
            format: 'wav'
          }
        };
      }

      console.log(`Cache miss for key: ${cacheKey}, generating new audio...`);

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

      // Ensure temp directory exists
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      // Save the audio file with cache key filename
      fs.writeFileSync(cachedFilePath, response.data);

      // Get file metadata
      const stats = fs.statSync(cachedFilePath);
      
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
      // Generate cache key using text, voice buffer hash, and language
      const voiceHash = crypto.createHash('sha256').update(voiceBuffer).digest('hex');
      const cacheKey = this.generateCacheKey(text, voiceHash, language);
      
      // Check if cached audio file exists
      const cachedPath = this.getCachedAudioPath(cacheKey);
      if (fs.existsSync(cachedPath)) {
        console.log(`Serving cached audio for key: ${cacheKey}`);
        const stats = fs.statSync(cachedPath);
        const cachedFilename = path.basename(cachedPath);
        
        return {
          success: true,
          audioUrl: `/api/tts/audio/${cachedFilename}`,
          metadata: {
            duration: 0,
            fileSize: stats.size,
            format: 'wav'
          }
        };
      }
      
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

      // Save the generated audio file with cache-based filename
      const cachedFilename = `cached_${cacheKey}.wav`;
      const outputPath = path.join(this.tempDir, cachedFilename);
      
      fs.writeFileSync(outputPath, response.data);
      console.log(`Generated and cached audio for key: ${cacheKey}`);

      // Get file metadata
      const stats = fs.statSync(outputPath);
      
      return {
        success: true,
        audioUrl: `/api/tts/audio/${cachedFilename}`,
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