// API Service for TTS functionality
const API_BASE_URL = '/api';

// Voice preset data structure
export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  filePath: string;
}

class ApiService {
  private async handleResponse(response: Response) {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Request failed');
    }
  }

  // Get all voice presets
  async getVoicePresets(): Promise<VoicePreset[]> {
    const response = await fetch(`${API_BASE_URL}/tts/presets`);
    return this.handleResponse(response);
  }

  // Generate speech with AI voice preset
  async generateSpeech(
    request: { text: string; voicePreset: string; language: string }, 
    signal?: AbortSignal
  ): Promise<{ audioUrl: string }> {
    const response = await fetch(`${API_BASE_URL}/tts/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal
    });

    return this.handleResponse(response);
  }

  // Generate speech with uploaded voice file
  async generateSpeechWithVoice(
    formData: FormData,
    signal?: AbortSignal
  ): Promise<{ audioUrl: string }> {
    const response = await fetch(`${API_BASE_URL}/tts/speak-with-voice`, {
      method: 'POST',
      body: formData,
      signal
    });

    return this.handleResponse(response);
  }

  // Download audio file
  async downloadAudio(audioUrl: string): Promise<Blob> {
    const response = await fetch(audioUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch audio file');
    }

    return response.blob();
  }

  // Get sample URL for voice preview
  getSampleUrl(voiceName: string): string {
    return `${API_BASE_URL}/tts/audio/samples/${voiceName}.wav`;
  }
}

// Export singleton instance
export const apiService = new ApiService();
