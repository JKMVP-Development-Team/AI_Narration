import React, { useState } from 'react';
import './App.css';

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
  const [text, setText] = useState('Welcome to the AI Narration App! This dark mode interface is designed for comfortable extended use. Enter your text and let our AI create beautiful narration for you.');
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);

  // Voice presets data that is hardcoded for now
  const voicePresets: VoicePreset[] = [
    {
      id: "sarah",
      name: "Sarah",
      style: "Featured",
      gender: "Female",
      accent: "American",
      description: "Clear, professional voice perfect for business presentations"
    },
    {
      id: "david",
      name: "David",
      style: "Professional",
      gender: "Male",
      accent: "British",
      description: "Clear, professional voice perfect for business presentations"
    },
    {
      id: "maria",
      name: "Maria",
      style: "Conversation",
      gender: "Female",
      accent: "Spanish",
      description: "Warm, friendly voice ideal for storytelling and casual content"
    },
    {
      id: "james",
      name: "James",
      style: "Authoritative",
      gender: "Male",
      accent: "American",
      description: "Strong, confident voice perfect for documentaries and news"
    },
    {
      id: "emma",
      name: "Emma",
      style: "Soothing",
      gender: "Female",
      accent: "Australian",
      description: "Calm, relaxing voice ideal for meditation and wellness content"
    },
    {
      id: "oliver",
      name: "Oliver",
      style: "Educational",
      gender: "Male",
      accent: "Canadian",
      description: "Clear, instructional voice perfect for tutorials and learning"
    }
  ];

  // Handlers for buttons
  const handleGenerate = () => {
    if (!selectedVoice) {
      alert('Please select a voice first!');
      return;
    }
    // TODO: generation logic here
    const selected = voicePresets.find(voice => voice.id === selectedVoice);
    alert(`Generating narration with voice: ${selected?.name}`);
  };

  const handleSave = () => {
    // TODO: save logic here
    alert('Audio saved successfully!');
  };

  // clear text area
  const handleClear = () => {
    setText('');
  };

  //TODO: Handle voice selection
  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
  };

  // Handle voice preview
  const handlePreview = (voiceName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the select event
    alert(`Previewing voice: ${voiceName}`);
  };

  return (
    // Main container
    <div className="container">
      <header>
        <h1>AI Narration Studio</h1>
        <p className="subtitle">Transform your text into natural sounding audio with AI-powered narration</p>
      </header>
      
      <div className="input-section">
        <textarea 
          placeholder="Enter text to narrate..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      {/* Button Controls*/}
      <div className="controls">
        <button className="primary-btn" onClick={handleGenerate}>
          <i className="fas fa-play-circle"></i>
          Generate Narration
        </button>
        <button className="secondary-btn" onClick={handleSave}>
          <i className="fas fa-save"></i>
          Save Audio
        </button>
        <button className="secondary-btn" onClick={handleClear}>
          <i className="fas fa-trash-alt"></i>
          Clear Text
        </button>
      </div>

      {/* Voice Presets Section */}
      <div className="voice-presets">
        <h2>AI Voice Presets</h2>
        <p className="subtitle">Choose from our collection of professional AI voices</p>
        
        <div className="presets-grid">
          {voicePresets.map((voice) => (
            <div 
              key={voice.id} 
              className={`preset-card ${selectedVoice === voice.id ? 'selected' : ''}`}
              onClick={() => handleVoiceSelect(voice.id)}
            >
              <div className="preset-header">
                <span className="preset-style">{voice.style}</span>
                <div className="preset-actions">
                  <button 
                    className="preview-btn"
                    onClick={(e) => handlePreview(voice.name, e)}
                  >
                    Preview
                  </button>
                  <button className="select-btn">
                    {selectedVoice === voice.id ? 'Selected' : 'Select Voice'}
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