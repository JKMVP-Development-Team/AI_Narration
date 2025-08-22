import React, { useState } from 'react';
import './App.css';

function App() {
  const [text, setText] = useState('Welcome to the AI Narration App! This dark mode interface is designed for comfortable extended use. Enter your text and let our AI create beautiful narration for you.');

  const handleGenerate = () => {
    // Your generation logic here
    alert('Narration generated successfully!');
  };

  const handleSave = () => {
    // Your save logic here
    alert('Audio saved successfully!');
  };

  const handleClear = () => {
    setText('');
  };

  return (
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
    </div>
  );
}

export default App;