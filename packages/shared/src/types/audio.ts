import { z } from "zod";

export const AudioSource = z.object({
  url: z.string().url(),
  format: z.string().optional(),
  durationMs: z.number().optional(),
});

export type AudioSource = z.infer<typeof AudioSource>;

export const AudioMeta = z.object({
  bitrate: z.number().optional(),
  sampleRate: z.number().optional(),
  channels: z.number().optional(),
  sizeBytes: z.number().optional(),
});

export type AudioMeta = z.infer<typeof AudioMeta>;
