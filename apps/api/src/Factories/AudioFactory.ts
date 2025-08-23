import { Audio } from '../../TextToSpeechInterface'

export class AudioImpl implements Audio {
  constructor(
    public readonly data: Buffer,
    public readonly mimeType: string
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
    return new AudioImpl(buffer, 'audio/mpeg')
  }
}