



// Analytics types
export interface SynthesisMetrics {
  userId: string
  charactersRequested: number
  charactersProcessed: number
  audioDurationSeconds: number
  voiceId: string
  modelId: string
  timestamp: Date
  processingTimeMs: number
  requestId?: string
}

export interface UserUsageStats {
  userId: string
  date: string
  totalRequests: number
  totalCharacters: number
  totalAudioDuration: number
  totalProcessingTime: number
  voicesUsed: string[]
  modelsUsed: string[]
  createdAt: Date
  updatedAt: Date
}

export interface TtsAnalyticsDocument {
  _id?: string
  userId: string
  timestamp: Date
  charactersRequested: number
  charactersProcessed: number
  audioDurationSeconds: number
  audioLengthBytes: number
  voiceId: string
  modelId: string
  processingTimeMs: number
  efficiencyRatio: number
  requestId: string
  success: boolean
}

export interface ErrorAnalyticsDocument {
  _id?: string
  userId?: string
  timestamp: Date
  error: string
  context: any
  level: 'error' | 'warning'
  service: 'tts' | 'voice' | 'general'
}

export interface UserDailyUsageDocument {
  _id?: string
  userId: string
  date: string // YYYY-MM-DD
  totalRequests: number
  totalCharacters: number
  totalAudioDuration: number
  totalProcessingTime: number
  voicesUsed: string[]
  modelsUsed: string[]
  createdAt: Date
  updatedAt: Date
}

export interface ValidationResult {
  isValid: boolean
  error?: string
  truncatedText?: string
}

export interface ITextValidator {
  validate(text: string): ValidationResult
}


export interface IAnalyticsLogger {
  logSynthesis(metrics: SynthesisMetrics): Promise<void>
  logError(error: string, context: any): Promise<void>
  getUserDailyStats(userId: string, date: string): Promise<UserUsageStats | null>
  getUserMonthlyStats(userId: string, year: number, month: number): Promise<UserUsageStats[]>
  updateUserUsage(userId: string, metrics: SynthesisMetrics): Promise<void>
}