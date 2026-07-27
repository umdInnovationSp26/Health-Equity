// Shared Google Identity Services (GIS) helpers for client-side OAuth token
// flows. Used by the download overlay (Sheets export) and the event page
// (Google Calendar export). Only needs NEXT_PUBLIC_GOOGLE_CLIENT_ID.

const GSI_SRC = "https://accounts.google.com/gsi/client";

/** Common OAuth scopes used by the app. */
export const GOOGLE_SCOPES = {
  sheets: "https://www.googleapis.com/auth/spreadsheets",
  calendar: "https://www.googleapis.com/auth/calendar.events",
} as const;

/** True once the GIS script has loaded and the oauth2 API is available. */
export function isGsiReady(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as any).google?.accounts?.oauth2
  );
}

/** Load the Google Identity Services script once and reuse the same promise. */
let gsiPromise: Promise<void> | null = null;
export function loadGsi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (isGsiReady()) return Promise.resolve();
  if (gsiPromise) return gsiPromise;

  gsiPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")));
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });
  return gsiPromise;
}

/**
 * Prompt the user for consent and resolve with a Google OAuth access token for
 * the given scope. Call this synchronously from a click handler (before any
 * await) so the browser doesn't block the consent popup.
 */
export function requestAccessToken(scope: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      reject(new Error("Google export is not configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID)."));
      return;
    }
    const oauth2 = (window as any).google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error("Google Identity Services not loaded."));
      return;
    }
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (response: { access_token?: string; error?: string }) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || "Authorization was cancelled."));
        } else {
          resolve(response.access_token);
        }
      },
      error_callback: (error: { message?: string }) => {
        reject(new Error(error?.message || "Authorization was cancelled."));
      },
    });
    tokenClient.requestAccessToken();
  });
}
