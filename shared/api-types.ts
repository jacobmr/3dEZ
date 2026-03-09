/**
 * Shared API type definitions for 3dEZ.
 *
 * These interfaces define the contract between backend and frontend.
 * Keep in sync with backend/src/app/models/api.py.
 */

export type {
  DesignCategory,
  DesignParams,
  MountingBracketParams,
  EnclosureParams,
  OrganizerParams,
} from "./design-params";

/** GET /api/health response */
export interface HealthResponse {
  status: string;
  service: string;
}

/** A single message in a conversation */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/** Lightweight conversation list item. */
export interface ConversationSummary {
  id: string;
  title: string | null;
  status: "active" | "completed";
  category: string | null;
  created_at: string;
  updated_at: string;
}

/** A persisted design linked to a conversation. */
export interface SavedDesign {
  id: string;
  conversation_id: string;
  parameters: import("./design-params").DesignParams;
  category: import("./design-params").DesignCategory;
  version: number;
  created_at: string;
}
