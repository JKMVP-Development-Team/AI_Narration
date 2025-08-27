import { IConfigProvider, RequestConfig } from '../../Interfaces'

export class ElevenLabsConfigProvider implements IConfigProvider {
  getApiKey(): string {
    const key = process.env.ELEVENLABS_API_KEY
    
    if (!key) throw new Error('Missing ELEVENLABS_API_KEY')
    return key
  }

  getBaseUrl(): string {
    return 'https://api.elevenlabs.io/v1'
  }

  getDefaultVoiceId(): string {
    return '21m00Tcm4TlvDq8ikWAM' // Rachel
  }

  getRequestConfig(): RequestConfig {
    return {
      timeout: Number(process.env.TTS_TIMEOUT) || 30000,
      retryConfig: {
        maxRetries: Number(process.env.TTS_MAX_RETRIES) || 3,
        baseDelay: Number(process.env.TTS_BASE_DELAY) || 1000,
        maxDelay: Number(process.env.TTS_MAX_DELAY) || 10000, 
        backoffFactor: Number(process.env.TTS_BACKOFF_MULTIPLIER) || 2
      }
    }
  }

  getTextLimits(): { maxLength: number; warningLength: number } {
    return {
      maxLength: Number(process.env.TTS_MAX_TEXT_LENGTH) || 5000,
      warningLength: Number(process.env.TTS_WARNING_TEXT_LENGTH) || 2500
    }
  }

  getMongoConfig(): { uri: string; database: string } {
    const uri = process.env.MONGODB_URI
    const database = process.env.MONGODB_DATABASE || 'ai_narration'

    if (!uri) throw new Error('Missing MONGODB_URI')

    return { uri, database }
  }
}