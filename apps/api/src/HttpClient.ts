import { IHttpClient } from '../TextToSpeechInterface'

export class FetchHttpClient implements IHttpClient {
  async post(url: string, options: { headers: Record<string, string>; body: string }): Promise<Response> {
    return fetch(url, {
      method: 'POST',
      headers: options.headers,
      body: options.body
    })
  }

  async get(url: string, options: { headers: Record<string, string> }): Promise<Response> {
    return fetch(url, {
      method: 'GET',
      headers: options.headers
    })
  }
}