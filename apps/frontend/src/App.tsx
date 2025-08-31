import React, { useState, useEffect } from "react";
import "./App.css";

// Placeholder structures, will import to a zod schema file

// Voice preset data structure
interface VoicePreset {
  id: string;
  name: string;
  style: string;
  gender: string;
  accent: string;
  description: string;
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
  const [selectedVoice, setSelectedVoice] = useState<string | null>("sarah");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(
    null
  );

  // API ready states
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Still using alerts for now, will implement error when frontend is ready
  const voicePresets: VoicePreset[] = [
    // Voice presets data - hardcoded for now, will come from API later
    {
      id: "sarah",
      name: "Sarah",
      style: "Featured",
      gender: "Female",
      accent: "American",
      description:
        "Clear, professional voice perfect for business presentations",
    },
    {
      id: "david",
      name: "David",
      style: "Professional",
      gender: "Male",
      accent: "British",
      description:
        "Clear, professional voice perfect for business presentations",
    },
  ];

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
      // TODO: Call API to fetch voice presets and update state with setVoicePresets
      // Currently using hardcoded data
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to load voice presets"
      );
      console.error("Voice presets loading error:", err);
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
      // TODO: Call API to generate speech and get the audio URL.

      // CURRENT SIMULATION - REPLACE WITH ABOVE API CALL:
      await new Promise((resolve) => setTimeout(resolve, 3000));
      if (!controller.signal.aborted) {
        setGeneratedAudioUrl("/mock.wav");
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
      // TODO: Fetch the audio file from generatedAudioUrl to trigger a download

      // CURRENT SIMULATION - REPLACE WITH ABOVE API CALL:
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const link = document.createElement("a");
      link.href = generatedAudioUrl;
      link.download = `narration_${Date.now()}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
      console.error("Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // API ENDPOINT: POST /api/tts/upload-voice
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

    try {
      // TODO: Call API to upload the voice file and get back the voice details.

      // CURRENT SIMULATION - REPLACE WITH ABOVE API CALL:
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert(`Custom voice "${file.name}" uploaded!`);

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

  // Preview voice; API ENDPOINT: POST /api/tts/preview
  const handlePreview = async (
    voiceId: string,
    voiceName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    try {
      // TODO: Call API to get a preview audio URL and play it.

      // CURRENT SIMULATION - REPLACE WITH ABOVE API CALL:
      alert(`${voiceName} preview`);

    } catch (err) {
      alert(err instanceof Error ? err.message : "Preview failed");
      console.error("Preview error:", err);
    }
  };

  return (
    // Main container
    <div className="container">
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
          <audio controls style={{ width: "100%", marginTop: "10px" }}>
            <source src={generatedAudioUrl} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
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
                <span className="preset-style">{voice.style}</span>
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
                <div className="preset-details">
                  <span className="preset-gender">{voice.gender}</span>
                  <span className="preset-accent">{voice.accent}</span>
                </div>
                <p className="preset-description">{voice.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
