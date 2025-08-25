// VoicePresets.tsx
import React, { useState } from 'react';

interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
  category: string;
  description: string;
  featured?: boolean;
}

const VoicePresets: React.FC = () => {
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  
  const voices: Voice[] = [
    {
      id: 'sarah',
      name: 'Sarah',
      gender: 'Female',
      accent: 'American',
      category: 'Featured',
      description: 'Clear, professional voice perfect for business presentations',
      featured: true
    },
    {
      id: 'david',
      name: 'David',
      gender: 'Male',
      accent: 'British',
      category: 'Professional',
      description: 'Authoritative and clear voice ideal for corporate content'
    },
    {
      id: 'maria',
      name: 'Maria',
      gender: 'Female',
      accent: 'Spanish',
      category: 'Conversational',
      description: 'Warm, friendly voice ideal for storytelling and casual content'
    },
    {
      id: 'james',
      name: 'James',
      gender: 'Male',
      accent: 'American',
      category: 'Energetic',
      description: 'Vibrant, engaging voice great for marketing and advertising'
    },
    {
      id: 'emma',
      name: 'Emma',
      gender: 'Female',
      accent: 'Australian',
      category: 'Authoritative',
      description: 'Strong, confident voice perfect for documentaries and news'
    },
    {
      id: 'oliver',
      name: 'Oliver',
      gender: 'Male',
      accent: 'Canadian',
      category: 'Soothing',
      description: 'Calm, relaxing voice ideal for meditation and wellness content'
    }
  ];

  const categories = [...new Set(voices.map(voice => voice.category))];

  const handlePreview = (voiceName: string) => {
    alert(`Previewing ${voiceName} voice...`);
  };

  const handleSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
    const voice = voices.find(v => v.id === voiceId);
    if (voice) {
      alert(`${voice.name} voice selected!`);
    }
  };

  return (
    <div className="voice-presets">
      <h2><i className="fas fa-microphone-alt"></i> AI Voice Presets</h2>
      <p className="presets-subtitle">Choose from our collection of professional AI voices</p>
      
      {categories.map(category => (
        <div key={category} className="preset-category">
          <h3>
            <i className={`fas ${
              category === 'Featured' ? 'fa-star' :
              category === 'Professional' ? 'fa-briefcase' :
              category === 'Conversational' ? 'fa-comments' :
              category === 'Energetic' ? 'fa-fire' :
              category === 'Authoritative' ? 'fa-gavel' : 'fa-spa'
            }`}></i>
            {category}
          </h3>
          
          <div className="preset-row">
            {voices
              .filter(voice => voice.category === category)
              .map(voice => (
                <div 
                  key={voice.id} 
                  className={`preset-card ${selectedVoice === voice.id ? 'selected' : ''}`}
                >
                  <div className="voice-name">{voice.name}</div>
                  <div className="voice-details">
                    <span><i className={`fas ${voice.gender === 'Female' ? 'fa-venus' : 'fa-mars'}`}></i> {voice.gender}</span>
                    <span><i className="fas fa-globe"></i> {voice.accent}</span>
                  </div>
                  <div className="voice-description">{voice.description}</div>
                  <div className="voice-actions">
                    <button className="preview-btn" onClick={() => handlePreview(voice.name)}>
                      <i className="fas fa-play"></i> Preview
                    </button>
                    <button className="select-btn" onClick={() => handleSelect(voice.id)}>
                      Select Voice
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      ))}
    </div>
  );
};

export default VoicePresets;