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

export interface SynthesizeInput {
  text: string
  voiceId?: string
  modelId?: string
  userId: string
}

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

export interface Audio {
  data: Buffer     
  mimeType: string
  duration?: number
  toBase64(): string
  toDataUrl(): string
}

export interface Voice {
  id: string
  name: string
  category?: string
  previewUrl?: string
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
}

export interface RequestConfig {
  timeout: number
  retryConfig: RetryConfig
}

export interface ValidationResult {
  isValid: boolean
  error?: string
  truncatedText?: string
}

export interface IAnalyticsLogger {
  logSynthesis(metrics: SynthesisMetrics): Promise<void>
  logError(error: string, context: any): Promise<void>
  getUserDailyStats(userId: string, date: string): Promise<UserUsageStats | null>
  getUserMonthlyStats(userId: string, year: number, month: number): Promise<UserUsageStats[]>
  updateUserUsage(userId: string, metrics: SynthesisMetrics): Promise<void>
}

export interface ITextValidator {
  validate(text: string): ValidationResult
}

export interface IAnalyticsLogger {
  logSynthesis(metrics: SynthesisMetrics): void
  logError(error: string, context: any): void
}

export interface IVoiceProvider {
  getVoices(limit?: number): Promise<Voice[]>
  getVoiceById(id: string): Promise<Voice | null>
}

export interface ITextToSpeech {
  synthesize(input: SynthesizeInput): Promise<Audio>
}

export interface IHttpClient {
  post(url: string, options: { headers: Record<string, string>; body: string }, config?: RequestConfig): Promise<Response>
  get(url: string, options: { headers: Record<string, string> }, config?: RequestConfig): Promise<Response>
}

export interface IConfigProvider {
  getApiKey(): string
  getBaseUrl(): string
  getDefaultVoiceId(): string
  getRequestConfig(): RequestConfig
  getTextLimits(): { maxLength: number; warningLength: number }
}