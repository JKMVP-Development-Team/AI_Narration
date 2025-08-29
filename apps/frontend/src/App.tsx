import React, { useState } from "react";
import "./App.css";

// Voice preset data structure
interface VoicePreset {
  id: string;
  name: string;
  style: string;
  gender: string;
  accent: string;
  description: string;
}

function App() {
  // State for text input and selected voice
  const [text, setText] = useState(
    "Welcome to the AI Narration App! This dark mode interface is designed for comfortable extended use. Enter your text and let our AI create beautiful narration for you."
  );
  const [selectedVoice, setSelectedVoice] = useState<string | null>("sarah");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(
    null
  );

  // Text limits configuration
  const TEXT_LIMITS = {
    max: 1000, // Max characters
    min: 5, // Min characters for generation
  };

  // Character count
  const characterCount = text.length;

  // Voice presets data - hardcoded for now, will come from API later
  const voicePresets: VoicePreset[] = [
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
    {
      id: "maria",
      name: "Maria",
      style: "Conversation",
      gender: "Female",
      accent: "Spanish",
      description:
        "Warm, friendly voice ideal for storytelling and casual content",
    },
    {
      id: "james",
      name: "James",
      style: "Authoritative",
      gender: "Male",
      accent: "American",
      description: "Strong, confident voice perfect for documentaries and news",
    },
    {
      id: "emma",
      name: "Emma",
      style: "Soothing",
      gender: "Female",
      accent: "Australian",
      description:
        "Calm, relaxing voice ideal for meditation and wellness content",
    },
    {
      id: "oliver",
      name: "Oliver",
      style: "Educational",
      gender: "Male",
      accent: "Canadian",
      description:
        "Clear, instructional voice perfect for tutorials and learning",
    },
  ];

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

  // Generate narration
  const handleGenerate = () => {
    if (!selectedVoice) return alert("Select a voice first!");
    if (!text.trim()) return alert("Enter some text!");
    if (text.length < TEXT_LIMITS.min)
      return alert(`Minimum ${TEXT_LIMITS.min} characters!`);

    setIsGenerating(true);
    // TODO: await fetch('/api/tts/speak')

    setTimeout(() => {
      setGeneratedAudioUrl("/mock.wav");
      setIsGenerating(false);
    }, 1000);
  };

  // Save audio
  const handleSave = () => {
    if (!generatedAudioUrl) return alert("Generate audio first!");
    // TODO: await fetch(generatedAudioUrl)
    alert("Saved!");
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

  // Preview voice
  const handlePreview = (
    voiceId: string,
    voiceName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    // TODO: await fetch('/api/tts/speak')
    alert(`${voiceName} preview`);
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
          disabled={isGenerating}
        >
          <i className="fas fa-play-circle"></i>
          {isGenerating ? "Generating..." : "Generate Narration"}
        </button>
        <button
          className="secondary-btn"
          onClick={handleSave}
        >
          <i className="fas fa-save"></i>
          Save Audio
        </button>
        <button className="secondary-btn" onClick={handleClear}>
          <i className="fas fa-trash-alt"></i>
          Clear Text
        </button>
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
