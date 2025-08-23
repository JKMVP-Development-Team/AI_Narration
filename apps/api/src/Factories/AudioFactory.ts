import { Audio } from '../../TextToSpeechInterface'
import { AudioAnalyzer } from '../Utilities/AudioAnalyzer'

export class AudioImpl implements Audio {
  constructor(
    public readonly data: Buffer,
    public readonly mimeType: string,
    public readonly duration?: number
  ) {}

  toBase64(): string {
    return this.data.toString('base64')
  }

  toDataUrl(): string {
    return `data:${this.mimeType};base64,${this.toBase64()}`
  }
}

export class AudioFactory {
  static createMp3Audio(buffer: Buffer): Audio {
    const duration = AudioAnalyzer.calculateMP3Duration(buffer)
    return new AudioImpl(buffer, 'audio/mpeg', duration)
  }

  static createAudioWithDuration(buffer: Buffer, mimeType: string, duration: number): Audio {
    return new AudioImpl(buffer, mimeType, duration)
  }
}