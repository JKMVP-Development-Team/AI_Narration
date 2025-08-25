export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  filePath: string;
}

export interface TTSRequest {
  text: string;
  voicePreset?: string;
  customVoiceFile?: string;
  language: string;
  speed?: number;
  pitch?: number;
}

export interface TTSResponse {
  success: boolean;
  audioUrl?: string;
  audioBuffer?: Buffer;
  error?: string;
  metadata?: {
    duration: number;
    fileSize: number;
    format: string;
  };
}

export interface UserVoiceUpload {
  userId: string;
  filename: string;
  originalName: string;
  voiceId: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  createdAt: Date;
}

export interface VoiceTrainingRequest {
  userId: string;
  voiceId: string;
  audioFile: Buffer;
  voiceName: string;
  description?: string;
}

export interface VoiceTrainingResponse {
  success: boolean;
  voiceId?: string;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  estimatedCompletion?: Date;
}

// API Response wrappers
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// XTTS API specific types
export interface XTTSApiRequest {
  text: string;
  speaker_wav: string;
  language: string;
  temperature?: number;
  length_penalty?: number;
  repetition_penalty?: number;
  top_k?: number;
  top_p?: number;
}

export interface XTTSApiResponse {
  audio?: string; // base64 or buffer
  error?: string;
  message?: string;
}