import { ITextToSpeech, SynthesizeInput, Audio, IHttpClient, IConfigProvider, ITextValidator, IAnalyticsLogger, SynthesisMetrics } from '../../Interfaces'
import { AudioFactory } from '../Factories/AudioFactory'

export class ElevenLabsTTS implements ITextToSpeech {
  constructor(
    private readonly httpClient: IHttpClient,
    private readonly config: IConfigProvider,
    private readonly textValidator: ITextValidator,
    private readonly analyticsLogger: IAnalyticsLogger
  ) {}

  async synthesize(input: SynthesizeInput): Promise<Audio> {
    const startTime = Date.now()
    const originalCharCount = input.text.length


    try {
      const validation = this.textValidator.validate(input.text)
    
      if (!validation.isValid) {
        this.analyticsLogger.logError('Text validation failed', {
          originalLength: originalCharCount,
          error: validation.error
        })
        throw new Error(validation.error)
      }
      const processedInput = {
        ...input,
        text: validation.truncatedText || input.text
      }

      const processedCharCount = processedInput.text.length
      
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

      const response = await this.httpClient.post(url, { headers, body }, this.config.getRequestConfig())
      
      
      if (!response.ok) {
        const errorText = await this.safeText(response)
        const error = `TTS synthesis failed: ${response.status} ${response.statusText} - ${errorText}`
        
        this.analyticsLogger.logError('HTTP request failed', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          charactersRequested: originalCharCount,
          charactersProcessed: processedCharCount
        })
        throw new Error(error)
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const audio = AudioFactory.createMp3Audio(buffer)

      const endTime = Date.now()
      const processingTime = endTime - startTime

      // Log synthesis metrics
      const metrics: SynthesisMetrics = {
        userId: input.userId,
        charactersRequested: originalCharCount,
        charactersProcessed: processedCharCount,
        audioDurationSeconds: audio.duration || 0,
        voiceId: this.getVoiceId(processedInput),
        modelId: processedInput.modelId ?? 'eleven_multilingual_v2',
        timestamp: new Date(startTime),
        processingTimeMs: processingTime
      }

      this.analyticsLogger.logSynthesis(metrics)

      return audio
    } catch (error) {
      const endTime = Date.now()
      const processingTimeMs = endTime - startTime
      
      this.analyticsLogger.logError('Synthesis failed', {
        error: (error as Error).message,
        charactersRequested: originalCharCount,
        processingTimeMs
      })
      
      throw error
    }
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