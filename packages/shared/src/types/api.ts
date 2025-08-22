import { z } from "zod";
import {
  CreateNarrationRequest,
  NarrationResponse,
  NarrationStatus,
} from "./narration";

// Request to create a new narration job
export const PostNarrationsRequest = CreateNarrationRequest;
export type PostNarrationsRequest = z.infer<typeof PostNarrationsRequest>;

// Response when creating a narration job (usually contains id and initial status)
export const PostNarrationsResponse = z.object({
  id: z.string(),
  status: NarrationStatus,
});

export type PostNarrationsResponse = z.infer<typeof PostNarrationsResponse>;

// Get narration by id
export const GetNarrationResponse = NarrationResponse;
export type GetNarrationResponse = z.infer<typeof GetNarrationResponse>;
