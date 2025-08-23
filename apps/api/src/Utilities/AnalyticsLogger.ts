import { IAnalyticsLogger, SynthesisMetrics } from '../../TextToSpeechInterface'

export class ConsoleAnalyticsLogger implements IAnalyticsLogger {
  logSynthesis(metrics: SynthesisMetrics): void {
    const logEntry = {
      timestamp: metrics.timestamp.toISOString(),
      charactersRequested: metrics.charactersRequested,
      charactersProcessed: metrics.charactersProcessed,
      audioDurationSeconds: metrics.audioDurationSeconds,
      audioLengthBytes: this.formatBytes(metrics.audioDurationSeconds * 16000),
      voiceId: metrics.voiceId,
      modelId: metrics.modelId,
      processingTimeMs: metrics.processingTimeMs,
      efficiencyRatio: this.calculateEfficiency(metrics.audioDurationSeconds, metrics.processingTimeMs)
    }

    console.log('TTS Synthesis Analytics:', JSON.stringify(logEntry, null, 2))
    
    
    console.log(`TTS: ${metrics.charactersProcessed} chars → ${metrics.audioDurationSeconds.toFixed(2)}s audio (${metrics.processingTimeMs}ms processing)`)
  }

  logError(error: string, context: any): void {
    console.error('TTS Error Analytics:', {
      timestamp: new Date().toISOString(),
      error,
      context
    })
  }

  private calculateEfficiency(audioDuration: number, processingTime: number): number {
    return audioDuration > 0 ? processingTime / (audioDuration * 1000) : 0
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}