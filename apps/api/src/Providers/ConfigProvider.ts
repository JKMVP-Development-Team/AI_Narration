import { IConfigProvider } from '../../TextToSpeechInterface'

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
}