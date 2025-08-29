export interface Voice {
  id: string;
  name: string;
  category: string;
  previewUrl: string;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url: string;
  description?: string;
  labels?: Record<string, string>;
  samples?: any[];
  settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[];
}

export interface TTSRequest {
  text: string;
  model_id?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
  };
}


// Analytics types
export interface SynthesisMetrics {
  userId: string
  charactersRequested: number
  charactersProcessed: number
  audioDurationSeconds: number
  voiceId: string
  modelId: string
  timestamp: Date
  processingTimeMs: number
  requestId?: string
}

export interface UserUsageStats {
  userId: string
  date: string
  totalRequests: number
  totalCharacters: number
  totalAudioDuration: number
  totalProcessingTime: number
  voicesUsed: string[]
  modelsUsed: string[]
  createdAt: Date
  updatedAt: Date
}

export interface TtsAnalyticsDocument {
  _id?: string
  userId: string
  timestamp: Date
  charactersRequested: number
  charactersProcessed: number
  audioDurationSeconds: number
  audioLengthBytes: number
  voiceId: string
  modelId: string
  processingTimeMs: number
  efficiencyRatio: number
  requestId: string
  success: boolean
}

export interface ErrorAnalyticsDocument {
  _id?: string
  userId?: string
  timestamp: Date
  error: string
  context: any
  level: 'error' | 'warning'
  service: 'tts' | 'voice' | 'general'
}

export interface UserDailyUsageDocument {
  _id?: string
  userId: string
  date: string // YYYY-MM-DD
  totalRequests: number
  totalCharacters: number
  totalAudioDuration: number
  totalProcessingTime: number
  voicesUsed: string[]
  modelsUsed: string[]
  createdAt: Date
  updatedAt: Date
}