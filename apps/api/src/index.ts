import express from "express";
import cors from "cors";
import { z } from "zod";
import {
  CreateNarrationRequest,
  NarrationStatus,
} from "../../../packages/shared/src/types/narration";

const app = express();
app.use(cors());
app.use(express.json());

// Define a simple type for our in-memory store
type StoredNarration = {
  id: string;
  status: z.infer<typeof NarrationStatus>;
  audioUrl?: string;
  createdAt: string;
};

// Use an in-memory Map to act as a temporary database ; implement cloud storage + mongodb here
const store = new Map<string, StoredNarration>();

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

// POST /v1/narrations - create a narration job
app.post("/v1/narrations", (req, res) => {
  const parse = CreateNarrationRequest.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "invalid request" });
  }

  const id = makeId();
  const item: StoredNarration = {
    id,
    status: "queued", // The job starts as "queued"
    createdAt: new Date().toISOString(),
  };

  store.set(id, item);

  // Simulate the job processing in the background ; Implement AI TTS here
  setTimeout(() => {
    const job = store.get(id);
    if (job) {
      job.status = "completed"; // After 2 seconds, the job is "completed"
      job.audioUrl = `/v1/narrations/${id}/stream`;
      store.set(id, job);
    }
  }, 2000); // 2-second delay

  // Immediately return the initial "queued" status
  res.status(202).json({
    id: item.id,
    status: item.status,
    createdAt: item.createdAt,
  });
});

// GET /v1/narrations/:id - get the current status of the job
app.get("/v1/narrations/:id", (req, res) => {
  const item = store.get(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "not found" });
  }
  res.json(item);
});

// GET /v1/narrations/:id/stream - return the audio file
app.get("/v1/narrations/:id/stream", (req, res) => {
  const item = store.get(req.params.id);
  if (!item) {
    return res.status(404).send("Not Found");
  }
  if (item.status !== "completed") {
    return res.status(409).send("Narration not ready yet.");
  }

  // Return mock WAV file:
  const minimalWav = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
    0x40, 0x1f, 0x00, 0x00, 0x80, 0x3e, 0x00, 0x00, 0x02, 0x00, 0x10, 0x00,
    0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00,
  ]);

  res.setHeader("Content-Type", "audio/wav");
  res.send(minimalWav);
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () =>
  console.log(`API server listening on http://localhost:${port}`)
);
