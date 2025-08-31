



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
  getUserDailyStats(userId: string, date: string): Promise<UserUsageStats | null>
  getUserMonthlyStats(userId: string, year: number, month: number): Promise<UserUsageStats[]>
  updateUserUsage(userId: string, metrics: SynthesisMetrics): Promise<void>
}