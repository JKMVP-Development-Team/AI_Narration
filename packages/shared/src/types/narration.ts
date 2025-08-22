import { z } from "zod";

// --- CORE NARRATION SCHEMAS ---

// Request to create a narration (barebones)
export const CreateNarrationRequest = z.object({
  text: z.string().min(1),
  voice: z.string().optional(),
});

export type CreateNarrationRequest = z.infer<typeof CreateNarrationRequest>;

// Response for a single narration object
export const NarrationStatus = z.enum([
  "queued",
  "processing",
  "completed",
  "failed",
]);
export const NarrationResponse = z.object({
  id: z.string(),
  status: NarrationStatus,
  audioUrl: z.string().url().optional(),
  error: z.string().optional(),
  createdAt: z.string().optional(),
});

export type NarrationResponse = z.infer<typeof NarrationResponse>;

// --- GENERIC RESPONSE SCHEMAS ---

/**
 * Generic schema for API errors
 */
export const ErrorResponse = z.object({
  message: z.string(),
  details: z.string().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponse>;

/**
 * Generic schema for paginated lists
 */
export const PaginatedNarrationsResponse = z.object({
  items: z.array(NarrationResponse),
  totalItems: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type PaginatedNarrationsResponse = z.infer<
  typeof PaginatedNarrationsResponse
>;
