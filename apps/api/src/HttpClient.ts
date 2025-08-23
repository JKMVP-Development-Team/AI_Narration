import { IHttpClient, RequestConfig } from '../TextToSpeechInterface'

export class FetchHttpClient implements IHttpClient {
  async post(
    url: string, 
    options: { headers: Record<string, string>; body: string }, 
    config?: RequestConfig
  ): Promise<Response> {
    return this.executeWithRetry(() => this.makeRequest(url, {
      method: 'POST',
      headers: options.headers,
      body: options.body
    }, config), config)
  }

  async get(
    url: string, 
    options: { headers: Record<string, string> }, 
    config?: RequestConfig
  ): Promise<Response> {
    return this.executeWithRetry(() => this.makeRequest(url, {
      method: 'GET',
      headers: options.headers
    }, config), config)
  }

  private async makeRequest(url: string, init: RequestInit, config?: RequestConfig): Promise<Response> {
    const controller = new AbortController()
    const timeout = config?.timeout || 30000

    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`)
      }
      throw error
    }
  }

  private async executeWithRetry(
    operation: () => Promise<Response>, 
    config?: RequestConfig
  ): Promise<Response> {
    const retryConfig = config?.retryConfig || {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2
    }

    let lastError: Error = new Error('Unknown error')

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const response = await operation()
        
        // Don't retry on client errors (4xx), only server errors (5xx) and network issues
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on the last attempt
        if (attempt === retryConfig.maxRetries) {
          break
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt),
          retryConfig.maxDelay
        )

        console.warn(`Request attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`)
        await this.sleep(delay)
      }
    }

    throw new Error(`Request failed after ${retryConfig.maxRetries + 1} attempts: ${lastError.message}`)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}