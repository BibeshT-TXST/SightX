/**
 * Anonymous trial session.
 *
 * V2 has no sign-in. Each browser gets a random ID, stored in localStorage
 * and sent with every API request, so a visitor sees only their own scans.
 * It separates visitors' data; it is not authentication.
 */
const STORAGE_KEY = 'sightx.trialSession';

// Fallback when storage is unavailable (private mode, blocked site data):
// the session then lasts until the tab is reloaded
let memorySessionId = null;

export function getSessionId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    memorySessionId ??= crypto.randomUUID();
    return memorySessionId;
  }
}

/** Start over with a new, empty session. */
export function resetSession() {
  memorySessionId = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable: the in-memory reset above is enough
  }
}
