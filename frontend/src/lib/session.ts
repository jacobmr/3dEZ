const SESSION_KEY = "3dez-session-id";

function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Get or create a persistent session UUID stored in localStorage.
 */
export function getSessionId(): string {
  if (typeof window === "undefined") {
    // SSR fallback — should never be used for actual requests
    return "server-placeholder";
  }

  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}
