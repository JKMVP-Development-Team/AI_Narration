import { IVoiceProvider, Voice, IHttpClient, IConfigProvider } from '../../Interfaces'

export class ElevenLabsVoiceProvider implements IVoiceProvider {
  constructor(
    private readonly httpClient: IHttpClient,
    private readonly config: IConfigProvider
  ) {}

  async getVoices(limit = 10): Promise<Voice[]> {
    const url = `https://api.elevenlabs.io/v2/voices`

    const headers = {
      'xi-api-key': this.config.getApiKey(),
      'Accept': 'application/json'
    }

    const response = await this.httpClient.get(url, { headers })
    
    if (!response.ok) {
      throw new Error(`Failed to get voices: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as { voices: any[] }
    const voices = (data.voices ?? []).slice(0, limit)
    
    return voices.map(this.mapToVoice)
  }

  async getVoiceById(id: string): Promise<Voice | null> {
    const voices = await this.getVoices(100) // Get more to search
    return voices.find(v => v.id === id) ?? null
  }

  private mapToVoice(apiVoice: any): Voice {
    return {
      id: apiVoice.voice_id,
      name: apiVoice.name,
      category: apiVoice.category,
      previewUrl: apiVoice.preview_url
    }
  }
}