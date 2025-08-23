import { ITextToSpeech, SynthesizeInput, Audio, IHttpClient, IConfigProvider } from '../../TextToSpeechInterface'
import { AudioFactory } from '../Factories/AudioFactory'

export class ElevenLabsTTS implements ITextToSpeech {
  constructor(
    private readonly httpClient: IHttpClient,
    private readonly config: IConfigProvider
  ) {}

  async synthesize(input: SynthesizeInput): Promise<Audio> {
    this.validateInput(input)
    
    const url = `${this.config.getBaseUrl()}/text-to-speech/${this.getVoiceId(input)}`
    const headers = {
      'xi-api-key': this.config.getApiKey(),
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    }
    const body = JSON.stringify({
      model_id: input.modelId ?? 'eleven_multilingual_v2',
      text: input.text
    })

    const response = await this.httpClient.post(url, { headers, body })
    
    if (!response.ok) {
      throw new Error(`TTS synthesis failed: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    return AudioFactory.createMp3Audio(buffer)
  }

  private validateInput(input: SynthesizeInput): void {
    if (!input.text?.trim()) {
      throw new Error('Text is required for synthesis')
    }
  }

  private getVoiceId(input: SynthesizeInput): string {
    return input.voiceId ?? this.config.getDefaultVoiceId()
  }
}