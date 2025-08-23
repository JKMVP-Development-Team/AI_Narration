import { ITextToSpeech, SynthesizeInput, Audio, IHttpClient, IConfigProvider, ITextValidator } from '../../TextToSpeechInterface'
import { AudioFactory } from '../Factories/AudioFactory'

export class ElevenLabsTTS implements ITextToSpeech {
  constructor(
    private readonly httpClient: IHttpClient,
    private readonly config: IConfigProvider,
    private readonly textValidator: ITextValidator
  ) {}

  async synthesize(input: SynthesizeInput): Promise<Audio> {
    const validation = this.textValidator.validate(input.text)
    
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid text input')
    }

    const processedInput = {
      ...input,
      text: validation.truncatedText || input.text
    }

    // Log warnings if text was modified
    if (validation.error && validation.truncatedText) {
      console.warn(`Text validation warning: ${validation.error}`)
    }

    const url = `${this.config.getBaseUrl()}/text-to-speech/${this.getVoiceId(processedInput)}`
    const headers = {
      'xi-api-key': this.config.getApiKey(),
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    }
    const body = JSON.stringify({
      model_id: processedInput.modelId ?? 'eleven_multilingual_v2',
      text: processedInput.text
    })

    const requestConfig = this.config.getRequestConfig()
    const response = await this.httpClient.post(url, { headers, body }, requestConfig)
    
    
    if (!response.ok) {
      const errorText = await this.safeText(response)
      throw new Error(`TTS synthesis failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    return AudioFactory.createMp3Audio(buffer)
  }

  private getVoiceId(input: SynthesizeInput): string {
    return input.voiceId ?? this.config.getDefaultVoiceId()
  }

  private async safeText(response: Response): Promise<string> {
    try {
      return await response.text()
    } catch {
      return 'Unable to read error details'
    }
  }
}