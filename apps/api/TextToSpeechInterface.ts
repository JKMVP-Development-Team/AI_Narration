export interface SynthesizeInput {
  text: string
  voiceId?: string
  modelId?: string
}

export interface Audio {
  data: Buffer     
  mimeType: string

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

export interface ITextValidator {
  validate(text: string): ValidationResult
}

export interface ValidationResult {
  isValid: boolean
  error?: string
  truncatedText?: string
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