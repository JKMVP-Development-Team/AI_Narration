import React, { useState } from "react";

const API_BASE = "http://localhost:4000";

function App() {
  // Basic text and voice state
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("");
  
  // Loading and status states
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  
  // Narration result states
  const [narrationId, setNarrationId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Additional states needed for the functions
  const [voicePresets, setVoicePresets] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<any>(null);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);

  async function getText() {
    setLoading(true);
    setStatus("fetching_text");
    
    try {
      // TODO: Replace with actual API call
      // const res = await fetch(`${API_BASE}/v1/text/${textId}`);
      // const data = await res.json();
      
      // Mock data for now
      const data = { 
        text: "This is mock text content",
        wordCount: 50,
        estimatedDuration: 20
      };
      
      setText(data.text);
      setWordCount(data.wordCount);
      setStatus("text_loaded");
      
    } catch (err) {
      setStatus("error");
      setError("Failed to load text");
    } finally {
      setLoading(false);
    }
  }

  async function getVoicePresets() {
    setLoadingPresets(true);
    setStatus("loading_voices");
    
    try {
      // TODO: Replace with actual API call
      // const res = await fetch(`${API_BASE}/v1/voices`);
      // const voices = await res.json();
      
      // Mock data for now
      const voices = [
        { id: 'sarah-001', name: 'Sarah', category: 'Professional' },
        { id: 'david-001', name: 'David', category: 'Conversational' },
        { id: 'maria-001', name: 'Maria', category: 'Energetic' }
      ];
      
      setVoicePresets(voices);
      setSelectedVoice(voices[0]); // Auto-select first
      setStatus("voices_loaded");
      
    } catch (err) {
      setStatus("error");
      setError("Failed to load voice presets");
    } finally {
      setLoadingPresets(false);
    }
  }

  async function createNarration(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setStatus("submitting");
    setAudioUrl(null);

    try {
      // TODO: Replace with actual API call
      // const res = await fetch(`${API_BASE}/v1/narrations`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ text, voice }),
      // });
      // const data = await res.json();

      // Mock response for now
      const data = {
        id: `mock_${Date.now()}`,
        status: "queued"
      };

      setNarrationId(data.id);
      setStatus(data.status);

      // Poll for completion (this will also be mocked)
      pollForCompletion(data.id);
      
    } catch (err) {
      setStatus("error");
      setLoading(false);
    }
  }

  async function pollForCompletion(id: string) {
    const poll = setInterval(async () => {
      try {
        // TODO: Replace with actual API call
        // const res = await fetch(`${API_BASE}/v1/narrations/${id}`);
        // const data = await res.json();

        // Mock polling response
        const data = {
          id: id,
          status: "completed",
          audioUrl: "/v1/narrations/" + id + "/stream"
        };

        setStatus(data.status);
        if (data.status === "completed") {
          clearInterval(poll);
          setAudioUrl(`${API_BASE}${data.audioUrl}`);
          setLoading(false);
        }
      } catch (err) {
        clearInterval(poll);
        setStatus("error");
        setLoading(false);
      }
    }, 800);
  }

  async function downloadAudio() {
    if (!narrationId) return;
    
    setDownloading(true);
    setStatus("downloading");
    
    try {
      // TODO: Replace with actual API call
      // const res = await fetch(`${API_BASE}/v1/narrations/${narrationId}/stream`);
      // const blob = await res.blob();
      
      // Mock download for now
      const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
      
      const url = URL.createObjectURL(mockBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `narration-${narrationId}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      
      setStatus("download_complete");
      
    } catch (err) {
      setStatus("download_error");
      setError("Download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>AI Narration App</h1>
      
      <form onSubmit={createNarration} style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="text">Text to narrate:</label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            rows={4}
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="voice">Voice (optional):</label>
          <input
            id="voice"
            type="text"
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </div>

        <button type="submit" disabled={loading} style={{ padding: "10px 20px" }}>
          {loading ? "Processing..." : "Create Narration"}
        </button>
      </form>

      <div style={{ marginBottom: "20px" }}>
        <h3>Status: {status ?? "idle"}</h3>
        {narrationId && <p>Narration ID: {narrationId}</p>}
      </div>

      {audioUrl && (
        <div>
          <h3>Result</h3>
          <audio controls src={audioUrl} style={{ width: "100%", marginBottom: "10px" }} />
          <div>
            <button onClick={downloadAudio} style={{ padding: "8px 16px", marginRight: "10px" }}>
              Download Audio
            </button>
            <a href={audioUrl} target="_blank" rel="noreferrer">
              Open in new tab
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;