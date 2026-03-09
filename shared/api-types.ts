/**
 * Shared API type definitions for 3dEZ.
 *
 * These interfaces define the contract between backend and frontend.
 * Keep in sync with backend/src/app/models/api.py.
 */

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

/** Parameters describing a 3D design */
export interface DesignParameters {
  category: string;
  dimensions: Record<string, number>;
  features: Record<string, unknown>;
}
