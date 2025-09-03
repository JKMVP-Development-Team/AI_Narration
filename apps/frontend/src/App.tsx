import React, { useState, useEffect } from "react";
import "./App.css";

// API Configuration
const API_BASE_URL = '/api';

// Placeholder structures, will import to a zod schema file

// Voice preset data structure
interface VoicePreset {
  id: string;
  name: string;
  description: string;
  filePath: string;
}

// Custom voice upload structure
interface CustomVoice {
  id: string;
  name: string;
  file?: File; // Optional after upload
  uploadStatus: "uploading" | "ready" | "error";
  url?: string; // URL to the uploaded voice file
}

// API Response types for better type safety
interface TTSResponse {
  audioUrl: string;
  duration: number;
  voiceId: string;
}

interface VoicePresetsResponse {
  voices: VoicePreset[];
}

interface UploadVoiceResponse {
  voiceId: string;
  name: string;
  url: string;
}

function App() {
  // State for text input and selected voice

  const [text, setText] = useState(
    "Welcome to the AI Narration App! This dark mode interface is designed for comfortable extended use. Enter your text and let our AI create beautiful narration for you."
  );
  const [selectedVoice, setSelectedVoice] = useState<string | null>("josh");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState('home'); // State for navigation


  // API ready states
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Still using alerts for now, will implement error when frontend is ready
  const [voicePresets, setVoicePresets] = useState<VoicePreset[]>([]);

  // Text limits configuration
  const TEXT_LIMITS = {
    max: 1000,
    min: 5,
  };

  const characterCount = text.length;

  // API functions

  // Load initial voice presets
  useEffect(() => {
    try {
      loadVoicePresets();
      loadCustomVoices(); // Loading custom voices (assuming voices are saved to user account)
    } catch (err) {
      console.error("Error during initial load in useEffect:", err);
    }
  }, []);

  // API ENDPOINT: GET /api/tts/presets
  const loadVoicePresets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tts/presets`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setVoicePresets(data.data);
        console.log(`Loaded ${data.data.length} voice presets from API:`, data.data);
      } else {
        throw new Error(data.error || 'Failed to load voice presets');
      }
    } catch (err) {
      console.error("Voice presets loading error:", err);
      setVoicePresets([]); // Clear presets on error
    }
  };

  // API ENDPOINT: GET /api/tts/custom-voices
  const loadCustomVoices = async () => {
    try {
      // TODO: Call API to fetch user's saved custom voices
      // Currently no custom voices loaded on startup
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to load custom voices"
      );
      console.error("Custom voices loading error:", err);
    }
  };

  // Event Handlers

  // Simple text change handler with character limit
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;

    // Enforce maximum character limit
    if (newText.length <= TEXT_LIMITS.max) {
      setText(newText);
    } else {
      // Truncate text and show alert
      setText(newText.substring(0, TEXT_LIMITS.max));
      alert(`Text truncated to ${TEXT_LIMITS.max} characters maximum.`);
    }
  };

  // Generate narration; API ENDPOINT: POST /api/tts/speak
  const handleGenerate = async () => {
    if (!selectedVoice) return alert("Select a voice first!");
    if (!text.trim()) return alert("Enter some text!");
    if (text.length < TEXT_LIMITS.min)
      return alert(`Minimum ${TEXT_LIMITS.min} characters!`);

    setIsGenerating(true);
    setGeneratedAudioUrl(null);

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

try {
  // Send the text and voice selection to the backend API to generate audio.
  const response = await fetch(`${API_BASE_URL}/tts/speak`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text.trim(),
      voicePreset: selectedVoice,
      language: 'en'
    }),
    signal: controller.signal
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.success) {
    setGeneratedAudioUrl(data.data.audioUrl);
    console.log('Audio generated successfully:', data.data);
    alert('Audio generated successfully!');
  } else {
    throw new Error(data.error || 'Generation failed');
  }

    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        alert("Generation cancelled by user");
      } else {
        alert(err instanceof Error ? err.message : "Generation failed");
        console.error("Generation error:", err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsGenerating(false);
        setAbortController(null);
      }
    }
  };

  // Cancel generation
  const handleCancelGeneration = () => {
    if (abortController) {
      abortController.abort();
      setIsGenerating(false);
      setAbortController(null);
      alert("Generation cancelled!");
    }
  };

  // Save audio; API ENDPOINT: GET /api/tts/audio/:filename (for download)
  const handleDownloadAudio = async () => {
    if (!generatedAudioUrl) return alert("Generate audio first!");

    setIsDownloading(true);

    try {
      const response = await fetch(generatedAudioUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch audio file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `narration_${Date.now()}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      window.URL.revokeObjectURL(url);
      
      alert('Audio downloaded successfully!');

    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
      console.error("Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

// Custom voice upload - Uploads a file and generates narration in one step
  const handleCustomVoiceUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File type validation
    const validTypes = ["audio/wav", "audio/mp3"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a valid audio file (WAV, MP3)");
      return;
    }

    // File size validation (10MB limit)
    const maxSizeInMB = 10;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      alert(`File size too large. Maximum ${maxSizeInMB}MB allowed.`);
      return;
    }

    // Set uploading state
    setIsUploading(true);
    setGeneratedAudioUrl(null); // Clear any previous audio

    // Create a FormData object to send the file and text together
    const formData = new FormData();
    formData.append('voiceFile', file);
    formData.append('text', text.trim());
    formData.append('language', 'en');

    try {
      // Send the form data to the dedicated backend endpoint
      const response = await fetch(`${API_BASE_URL}/tts/speak-with-voice`, {
        method: 'POST',
        body: formData, // The browser automatically sets the correct 'Content-Type' for FormData
      });

      // Standard error handling for network issues
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      // Handle the API's specific success/error response
      if (data.success) {
        setGeneratedAudioUrl(data.data.audioUrl);
        alert('Narration generated successfully with your custom voice!');
      } else {
        throw new Error(data.error || 'Custom voice generation failed');
      }

    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }

    // Clear file input
    e.target.value = "";
  };

  // Clear text
  const handleClear = () => {
    if (text.length > 50 && !confirm(`Clear ${text.length} characters?`))
      return;
    setText("");
    setGeneratedAudioUrl(null);
  };

  // Select voice
  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
    setGeneratedAudioUrl(null);
  };

  // Preview voice - plays existing sample files
  const handlePreview = async (
    voiceId: string,
    voiceName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    try {
      const sampleUrl = `${API_BASE_URL}/tts/audio/samples/${voiceName}.wav`;
      
      const audio = new Audio(sampleUrl);
      audio.volume = 0.7;
      audio.playbackRate = 1.25; // Set playback speed to 1.25x
      audio.play().catch(err => {
        console.error('Sample playback failed:', err);
        alert(`Could not play preview for ${voiceName}.`);
      });

    } catch (err) {
      alert(err instanceof Error ? err.message : "Preview failed");
      console.error("Preview error:", err);
    }
  };

  return (
    // Main container
    <div className="container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-brand">
          <i className="fas fa-microphone-alt"></i>
          <span>AI Narration Studio</span>
        </div>
        {/* Navigation Button Controls*/}
        <ul className="nav-links">
          <li>
            <a 
              href="#home" 
              className={activeTab === 'home' ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); setActiveTab('home'); }}
            >
              <i className="fas fa-home"></i> Home
            </a>
          </li>
          <li>
            <a href="/history">
              <i className="fas fa-history"></i> History
            </a>
          </li>
          <li>
            <a href="/signup">
              <i className="fas fa-user-plus"></i> Sign Up
            </a>
          </li>
          <li>
            <a 
              href="#settings" 
              className={activeTab === 'settings' ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); setActiveTab('settings'); }}
            >
              <i className="fas fa-cog"></i> Settings
            </a>
          </li>
        </ul>
      </nav>

      <header>
        <h1>AI Narration Studio</h1>
        <p className="subtitle">
          Transform your text into natural sounding audio with AI-powered
          narration
        </p>
      </header>

      <div className="input-section">
        <textarea
          placeholder="Enter text to narrate..."
          value={text}
          onChange={handleTextChange}
        />

        {/* Simple character count */}
        <div className="character-count">
          <span>
            {characterCount} / {TEXT_LIMITS.max}
          </span>
        </div>
      </div>

      {/* Button Controls*/}
      <div className="controls">
        <button
          className="primary-btn"
          onClick={handleGenerate}
          disabled={isGenerating || isUploading}
        >
          <i className="fas fa-play-circle"></i>
          {isGenerating ? "Generating..." : "Generate Narration"}
        </button>

        {/* Placeholder cancel button appears during generation */}
        {isGenerating && (
          <button
            className="cancel-btn"
            onClick={handleCancelGeneration}
            style={{ marginLeft: "8px", padding: "6px 12px", fontSize: "14px" }}
          >
            Cancel
          </button>
        )}

        <button className="secondary-btn" onClick={handleDownloadAudio}>
          <i className="fas fa-save"></i>
          Save Audio
        </button>

        <button className="secondary-btn" onClick={handleClear}>
          <i className="fas fa-trash-alt"></i>
          Clear Text
        </button>

        {/* Placeholder custom voice upload button */}
        <label
          htmlFor="custom-voice-upload"
          className="secondary-btn upload-voice-btn"
        >
          <i className="fas fa-upload"></i>
          {isUploading ? "Uploading..." : "Upload Custom Voice"}
          <input
            id="custom-voice-upload"
            type="file"
            accept="audio/*"
            onChange={handleCustomVoiceUpload}
            disabled={isGenerating || isUploading}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {/* Audio Player - shows when audio is generated */}
      {generatedAudioUrl && (
        <div className="audio-player">
          <h3>Generated Audio</h3>
          <audio controls style={{ width: "100%", marginTop: "10px" }}
            onLoadedData={(e) => {
              // Set default playback speed to 1.25x
              const audioElement = e.target as HTMLAudioElement;
              audioElement.playbackRate = 1.25;
            }}
          >
            <source src={generatedAudioUrl} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
          <div style={{ marginTop: "8px", fontSize: "14px", color: "#888" }}>
            💡 Tip: Use browser controls to adjust playback speed (default: 1.25x)
          </div>
        </div>
      )}

      {/* Voice Presets Section */}
      <div className="voice-presets">
        <h2>AI Voice Presets</h2>
        <p className="subtitle">
          Choose from our collection of professional AI voices
        </p>

        <div className="presets-grid">
          {voicePresets.map((voice) => (
            <div
              key={voice.id}
              className={`preset-card ${
                selectedVoice === voice.id ? "selected" : ""
              }`}
              onClick={() => handleVoiceSelect(voice.id)}
            >
              <div className="preset-header">
                <span className="preset-style">Professional</span>
                <div className="preset-actions">
                  <button
                    className="preview-btn"
                    onClick={(e) => handlePreview(voice.id, voice.name, e)}
                  >
                    Preview
                  </button>
                  <button className="select-btn">
                    {selectedVoice === voice.id ? "Selected" : "Select Voice"}
                  </button>
                </div>
              </div>

              <div className="preset-content">
                <h3 className="preset-name">{voice.name}</h3>
                <p className="preset-description">{voice.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 JKMVP AI Narration. Powered by advanced AI voice synthesis.</p>
      </footer>
    </div>
  );
}

export default App;
