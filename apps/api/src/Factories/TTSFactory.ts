import { ITextToSpeech, IVoiceProvider } from '../../TextToSpeechInterface'
import { ElevenLabsTTS } from '../Providers/ElevenLabsTTSProvider'
import { FetchHttpClient } from '../HttpClient'
import { ElevenLabsConfigProvider } from '../Providers/ConfigProvider'
import { ElevenLabsVoiceProvider } from '../Providers/ElevenLabsVoiceProvider'
import { TTSTextValidator } from '../Utilities/TextValidator'
import { ConsoleAnalyticsLogger } from '../Utilities/AnalyticsLogger'

export class TTSFactory {
  static createElevenLabsTTS(): ITextToSpeech {
    const httpClient = new FetchHttpClient()
    const config = new ElevenLabsConfigProvider()
    const textLimits = config.getTextLimits()
    const textValidator = new TTSTextValidator(textLimits.maxLength, textLimits.warningLength)
    const analyticsLogger = new ConsoleAnalyticsLogger()
    
    return new ElevenLabsTTS(httpClient, config, textValidator, analyticsLogger)
  }

  static createElevenLabsVoiceProvider(): IVoiceProvider {
    const httpClient = new FetchHttpClient()
    const config = new ElevenLabsConfigProvider()
    return new ElevenLabsVoiceProvider(httpClient, config)
  }
}