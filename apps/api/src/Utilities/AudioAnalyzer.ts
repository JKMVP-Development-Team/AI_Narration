export class AudioAnalyzer {
  /**
   * Calculate audio duration from MP3 buffer
   * This is a simplified calculation - for production, consider using a proper audio library
   */
  static calculateDuration(buffer: Buffer): number {
    try {
      // For MP3, we can estimate duration using file size and bitrate
      // This is an approximation - real duration would require parsing MP3 headers
      const fileSizeBytes = buffer.length
      const estimatedBitrate = 128000
      const estimatedDurationSeconds = (fileSizeBytes * 8) / estimatedBitrate
      
      return Math.max(0.1, estimatedDurationSeconds)
    } catch (error) {
      console.warn('Failed to calculate audio duration:', error)
      return 0
    }
  }

  /**
   * More accurate duration calculation using MP3 frame analysis
   * This is a basic implementation - consider using mp3-duration library for production
   */
  static calculateMP3Duration(buffer: Buffer): number {
    try {
      let duration = 0
      let offset = 0
      
      while (offset < buffer.length - 4) {
        if (buffer[offset] === 0xFF && (buffer[offset + 1] & 0xE0) === 0xE0) {
          const header = buffer.readUInt32BE(offset)
          const frameInfo = this.parseMP3FrameHeader(header)
          
          if (frameInfo) {
            duration += frameInfo.sampleCount / frameInfo.sampleRate
            offset += frameInfo.frameSize
          } else {
            offset++
          }
        } else {
          offset++
        }
      }
      
      return duration || this.calculateDuration(buffer)
    } catch (error) {
      return this.calculateDuration(buffer)
    }
  }

  private static parseMP3FrameHeader(header: number): { sampleCount: number; sampleRate: number; frameSize: number } | null {
    const version = (header >> 19) & 0x3
    const layer = (header >> 17) & 0x3
    const bitrateIndex = (header >> 12) & 0xF
    const sampleRateIndex = (header >> 10) & 0x3
    
    if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15) {
      return null
    }

    const sampleRates = [44100, 48000, 32000]
    const bitrates = [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
    
    const sampleRate = sampleRates[sampleRateIndex]
    const bitrate = bitrates[bitrateIndex - 1] * 1000
    const sampleCount = 1152
    const frameSize = Math.floor((sampleCount * bitrate) / (sampleRate * 8))
    
    return { sampleCount, sampleRate, frameSize }
  }
}