import { getSessionId } from "./session";
import { getAccessToken } from "./auth";
import type {
  ConversationSummary,
  ConversationMessage,
  SavedDesign,
  DesignParams,
  AuthResponse,
  AuthUser,
} from "@shared/api-types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function headers(): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Session-ID": getSessionId(),
  };
  const token = getAccessToken();
  if (token) {
    h["Authorization"] = `Bearer ${token}`;
  }
  return h;
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "X-Session-ID": getSessionId(),
  };
  const token = getAccessToken();
  if (token) {
    h["Authorization"] = `Bearer ${token}`;
  }
  return h;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/*  SSE parsing                                                       */
/* ------------------------------------------------------------------ */

export interface SSEEvent {
  type: string;
  data: string;
}

/**
 * Parse a streaming SSE response into an async generator of events.
 */
export async function* parseSSE(
  response: Response,
): AsyncGenerator<SSEEvent, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop() ?? "";

      let currentEvent = "message";
      let currentData = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          currentData = line.slice(6);
        } else if (line === "") {
          // Empty line = end of event
          if (currentData) {
            yield { type: currentEvent, data: currentData };
          }
          currentEvent = "message";
          currentData = "";
        }
      }
    }

    // Flush any remaining data
    if (buffer.trim()) {
      const remaining = buffer.trim();
      if (remaining.startsWith("data: ")) {
        yield { type: "message", data: remaining.slice(6) };
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/*  Conversation endpoints                                            */
/* ------------------------------------------------------------------ */

interface CreateConversationResponse {
  conversation_id: string;
  title: string | null;
  status: string;
}

export async function createConversation(
  message: string,
): Promise<CreateConversationResponse> {
  const res = await fetch("/api/conversations/", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ message }),
  });
  return json<CreateConversationResponse>(res);
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const res = await fetch("/api/conversations/", { headers: headers() });
  return json<ConversationSummary[]>(res);
}

interface ConversationDetail {
  conversation: ConversationSummary;
  messages: ConversationMessage[];
  latest_design: SavedDesign | null;
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  const res = await fetch(`/api/conversations/${id}`, { headers: headers() });
  return json<ConversationDetail>(res);
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`/api/conversations/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`Delete failed: ${res.status}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Streaming message endpoints                                       */
/* ------------------------------------------------------------------ */

export async function* streamMessage(
  conversationId: string,
  message: string,
  photoId?: string,
): AsyncGenerator<SSEEvent, void, unknown> {
  const res = await fetch(`/api/conversations/${conversationId}/message`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ message, ...(photoId && { photo_id: photoId }) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }
  yield* parseSSE(res);
}

export async function* streamRevision(
  conversationId: string,
  message: string,
): AsyncGenerator<SSEEvent, void, unknown> {
  const res = await fetch(`/api/conversations/${conversationId}/revise`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }
  yield* parseSSE(res);
}

/* ------------------------------------------------------------------ */
/*  Design endpoints                                                  */
/* ------------------------------------------------------------------ */

export async function listDesigns(): Promise<SavedDesign[]> {
  const res = await fetch("/api/designs/", { headers: headers() });
  return json<SavedDesign[]>(res);
}

export async function getDesign(id: string): Promise<SavedDesign> {
  const res = await fetch(`/api/designs/${id}`, { headers: headers() });
  return json<SavedDesign>(res);
}

/* ------------------------------------------------------------------ */
/*  STL generation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Request STL generation from the parametric modeler.
 *
 * POST /api/generate with `{category, parameters}`.
 * Returns the raw binary STL bytes.
 */
export async function generateStl(
  category: string,
  parameters: Record<string, unknown>,
): Promise<ArrayBuffer> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ category, parameters }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");

    if (res.status === 503) {
      throw new Error("3D preview requires Docker environment");
    }
    if (res.status === 400) {
      throw new Error(`Invalid category: ${body}`);
    }
    if (res.status === 422) {
      throw new Error(`Invalid parameters: ${body}`);
    }
    throw new Error(`STL generation failed (${res.status}): ${body}`);
  }

  return res.arrayBuffer();
}

/* ------------------------------------------------------------------ */
/*  Photo endpoints                                                    */
/* ------------------------------------------------------------------ */

export async function uploadPhoto(
  conversationId: string,
  file: File,
): Promise<{ id: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/conversations/${conversationId}/photos`, {
    method: "POST",
    headers: authHeaders(),
    // No Content-Type — browser sets multipart boundary automatically
    body: formData,
  });
  return json<{ id: string; filename: string }>(res);
}

/* ------------------------------------------------------------------ */
/*  Auth endpoints                                                     */
/* ------------------------------------------------------------------ */

export async function authRegister(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": getSessionId(),
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  return json<AuthResponse>(res);
}

export async function authLogin(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": getSessionId(),
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  return json<AuthResponse>(res);
}

export async function authRefresh(): Promise<{ access_token: string }> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });
  return json<{ access_token: string }>(res);
}

export async function authMe(): Promise<AuthUser> {
  const token = getAccessToken();
  const res = await fetch("/api/auth/me", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return json<AuthUser>(res);
}

export async function authLogout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
}

/* Re-export types for convenience */
export type {
  ConversationSummary,
  ConversationMessage,
  SavedDesign,
  DesignParams,
  AuthResponse,
  AuthUser,
};
