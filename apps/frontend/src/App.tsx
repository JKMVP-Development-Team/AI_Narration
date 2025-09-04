import React, { useState, useEffect } from "react";
import "./App.css";
import { apiService, VoicePreset } from "./services/apiService";

// Placeholder structures, will import to a zod schema file

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
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Still using alerts for now, can implement error with frontend component
  const [voicePresets, setVoicePresets] = useState<VoicePreset[]>([]);
  const [uploadedCustomVoice, setUploadedCustomVoice] = useState<{ name: string; file: File; objectUrl?: string } | null>(null);
  const [activePreview, setActivePreview] = useState<HTMLAudioElement | null>(null);

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
    } catch (err) {
      console.error("Error during initial load in useEffect:", err);
    }
  }, []);

  // Cleanup object URLs when component unmounts or custom voice changes
  useEffect(() => {
    return () => {
      if (uploadedCustomVoice?.objectUrl) {
        URL.revokeObjectURL(uploadedCustomVoice.objectUrl);
      }
    };
  }, [uploadedCustomVoice?.objectUrl]);

  // API ENDPOINT: GET /api/tts/presets
  const loadVoicePresets = async () => {
    try {
      const presets = await apiService.getVoicePresets();
      setVoicePresets(presets);
      console.log(`Loaded ${presets.length} voice presets from API:`, presets);
    } catch (err) {
      console.error("Voice presets loading error:", err);
      setVoicePresets([]); // Clear presets on error
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

  // Generate narration; API ENDPOINT: POST /api/tts/speak or POST /api/tts/speak-with-voice
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
      let result;

      if (selectedVoice === "custom" && uploadedCustomVoice) {
        // Use custom voice endpoint with FormData
        const formData = new FormData();
        formData.append('voiceFile', uploadedCustomVoice.file);
        formData.append('text', text.trim());
        formData.append('language', 'en');

        result = await apiService.generateSpeechWithVoice(formData, controller.signal);
      } else {
        // Use AI voice preset endpoint
        result = await apiService.generateSpeech({
          text: text.trim(),
          voicePreset: selectedVoice,
          language: 'en'
        }, controller.signal);
      }

      setGeneratedAudioUrl(result.audioUrl);
      console.log('Audio generated successfully:', result);
      alert('Audio generated successfully!');

    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        alert("Generation cancelled by user");
      } else {
        alert(err instanceof Error ? err.message : "Generation failed");
        console.error("Generation error:", err);
      }
    } finally {
      setIsGenerating(false);
      setAbortController(null);
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
      const blob = await apiService.downloadAudio(generatedAudioUrl);
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

  // Custom voice upload - Uploads and stores the file for selection
  const handleCustomVoiceUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // File type validation
      const validTypes = ["audio/wav", "audio/mpeg", "audio/mp3"];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a valid audio file (WAV, MP3)");
        return;
      }

      // File size validation (30MB limit)
      const maxSizeInMB = 30;
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        alert(`File size too large. Maximum ${maxSizeInMB}MB allowed.`);
        return;
      }

      // Clean up previous object URL if it exists
      if (uploadedCustomVoice?.objectUrl) {
        URL.revokeObjectURL(uploadedCustomVoice.objectUrl);
      }

      // Create new object URL for the uploaded file
      const objectUrl = URL.createObjectURL(file);

      // Store the uploaded custom voice for display and selection
      setUploadedCustomVoice({ 
        name: file.name.replace(/\.[^/.]+$/, ""), 
        file,
        objectUrl 
      });
      setSelectedVoice("custom"); // Auto-select the custom voice
      setGeneratedAudioUrl(null); // Clear any previous audio

      alert('Custom voice uploaded successfully! Click Generate to create narration.');
    } finally {
      setIsUploading(false);
    }

    // Clear file input
    e.target.value = "";
  };  // Handle custom voice upload button click
  const handleCustomVoiceButtonClick = () => {
    const fileInput = document.getElementById('custom-voice-upload') as HTMLInputElement;
    fileInput?.click();
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
  const handlePreview = (voiceId: string, voiceName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (activePreview) {
      activePreview.pause();
      activePreview.currentTime = 0;
    }

    const sampleUrl = apiService.getSampleUrl(voiceName);
    const newAudio = new Audio(sampleUrl);
    
    newAudio.onended = () => {
      setActivePreview(null);
    };

    newAudio.volume = 0.7;
    newAudio.playbackRate = 1.25;
    
    newAudio.play().catch(err => {
      console.error('Sample playback failed:', err);
      alert(`Could not play preview for ${voiceName}.`);
      setActivePreview(null);
    });

    setActivePreview(newAudio);
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

        {/* Upload Custom Voice Button */}
        <button 
          className="secondary-btn upload-voice-btn"
          onClick={handleCustomVoiceButtonClick}
          disabled={isGenerating || isUploading}
        >
          <i className="fas fa-upload"></i>
          {isUploading ? "Uploading..." : "Upload Custom Voice"}
        </button>
        <input
          id="custom-voice-upload"
          type="file"
          accept="audio/*"
          onChange={handleCustomVoiceUpload}
          disabled={isGenerating}
          style={{ display: "none" }}
        />
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

      {/* Custom Voice Section - Shows when uploaded */}
      {uploadedCustomVoice && (
        <div className="voice-presets">
          <h2>Your Custom Voice</h2>
          <p className="subtitle">Your uploaded voice for AI narration</p>
          
          <div className="presets-grid">
            <div
              className={`preset-card ${
                selectedVoice === "custom" ? "selected" : ""
              }`}
              onClick={() => handleVoiceSelect("custom")}
            >
              <div className="preset-header">
                <span className="preset-style">Custom</span>
                <div className="preset-actions">
                  <button className="select-btn">
                    {selectedVoice === "custom" ? "Selected" : "Select Voice"}
                  </button>
                </div>
              </div>

              <div className="preset-content">
                <h3 className="preset-name">{uploadedCustomVoice.name}</h3>
                <p className="preset-description">Your personal voice upload</p>
                <audio controls style={{ width: '100%', marginTop: '10px' }} key={uploadedCustomVoice.objectUrl}>
                  <source src={uploadedCustomVoice.objectUrl} type={uploadedCustomVoice.file.type} />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
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
