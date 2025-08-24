import React, { useState } from "react";

const API_BASE = "http://localhost:4000";

function App() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [narrationId, setNarrationId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // POST /v1/narrations - create a narration job
  async function createNarration(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setStatus("submitting");
    setAudioUrl(null);

    try {
      const res = await fetch(`${API_BASE}/v1/narrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });

      if (!res.ok) {
        setStatus("error");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setNarrationId(data.id);
      setStatus(data.status);

      // Poll for completion
      pollForCompletion(data.id);
    } catch (err) {
      setStatus("error");
      setLoading(false);
    }
  }

  // GET /v1/narrations/:id - get the current status
  async function pollForCompletion(id: string) {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/narrations/${id}`);
        if (!res.ok) {
          clearInterval(poll);
          setStatus("error");
          setLoading(false);
          return;
        }
        const data = await res.json();
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

  // GET /v1/narrations/:id/stream - download audio
  async function downloadAudio() {
    if (!narrationId) return;
    try {
      const res = await fetch(`${API_BASE}/v1/narrations/${narrationId}/stream`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `narration-${narrationId}.wav`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download failed:', err);
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
