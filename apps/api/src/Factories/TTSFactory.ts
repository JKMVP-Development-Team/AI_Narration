import { ITextToSpeech, IVoiceProvider } from '../../TextToSpeechInterface'
import { ElevenLabsTTS } from '../Providers/ElevenLabsTTSProvider'
import { FetchHttpClient } from '../HttpClient'
import { ElevenLabsConfigProvider } from '../Providers/ConfigProvider'
import { ElevenLabsVoiceProvider } from '../Providers/ElevenLabsVoiceProvider'

export class TTSFactory {
  static createElevenLabsTTS(): ITextToSpeech {
    const httpClient = new FetchHttpClient()
    const config = new ElevenLabsConfigProvider()
    return new ElevenLabsTTS(httpClient, config)
  }

  static createElevenLabsVoiceProvider(): IVoiceProvider {
    const httpClient = new FetchHttpClient()
    const config = new ElevenLabsConfigProvider()
    return new ElevenLabsVoiceProvider(httpClient, config)
  }
}