"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

/** CSV text, or a (possibly async) function that builds it when the user clicks download. */
type CsvSource = string | (() => string | Promise<string>);

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GSI_SRC = "https://accounts.google.com/gsi/client";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

/** Load the Google Identity Services script once and reuse the same promise. */
let gsiPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve();
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

/** Prompt the user for consent and resolve with a Google OAuth access token. */
function requestAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const oauth2 = (window as any).google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error("Google Identity Services not loaded."));
      return;
    }
    const tokenClient = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SHEETS_SCOPE,
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

/**
 * Parse the CSV produced for download back into rows for the Sheets API.
 * Handles quoted fields, escaped quotes (""), and newlines inside quotes.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const clean = text.replace(/^﻿/, "");
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

interface DownloadOverlayProps {
  /** Whether the overlay is visible. */
  isOpen: boolean;
  /** Called when the user dismisses the overlay (backdrop, close button, or after a download). */
  onClose: () => void;
  /**
   * The CSV to download. Pass a ready string, or a function (sync or async) that
   * produces it on demand — handy when the data has to be fetched on click.
   */
  csvContent?: CsvSource;
  /** Base file name (without extension) used for the downloaded file. */
  fileName?: string;
}

/**
 * Reusable "choose export format" modal. Renders on top of the current page
 * (fixed overlay, no navigation). Callers pass the CSV to hand off for download.
 */
export default function DownloadOverlay({
  isOpen,
  onClose,
  csvContent,
  fileName = "export",
}: DownloadOverlayProps) {
  const [busy, setBusy] = useState(false);
  // Set when the sheet is created but the browser blocked the new-tab open,
  // so we can offer a clickable link instead.
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Preload the Google script while the overlay is open so the token popup
  // fires promptly on click (and stays tied to the user's gesture).
  useEffect(() => {
    if (!isOpen) return;
    setResultUrl(null);
    if (GOOGLE_CLIENT_ID) loadGsi().catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const downloadCsv = async () => {
    if (!csvContent || busy) return;
    setBusy(true);
    try {
      const text =
        typeof csvContent === "function" ? await csvContent() : csvContent;
      if (!text) return;

      const blob = new Blob(["﻿" + text], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onClose();
    } catch (error) {
      console.error("CSV download failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Unable to download data. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };


{/* PDF report download */}

  const downloadPDF = async () => {
    if (busy) return;
    setBusy(true);
    try {


    } finally {
        setBusy(false);
    }
};

  {/* Google Sheets export */}

  const exportToSheets = async () => {
    if (!csvContent || busy) return;
    if (!GOOGLE_CLIENT_ID) {
      alert("Google export is not configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID).");
      return;
    }

    // The consent popup must be opened synchronously from this click, or the
    // browser's popup blocker kills it. That requires GSI to be loaded already
    // (we preload it when the overlay opens). If it isn't ready yet, kick off
    // the load and ask the user to click again — we can't await here without
    // losing the user gesture that lets the popup through.
    if (!(window as any).google?.accounts?.oauth2) {
      loadGsi().catch(() => {});
      alert("Google sign-in is still loading — please click again in a moment.");
      return;
    }

    setBusy(true);
    // Open the popup FIRST (before any await, so it stays inside the gesture)...
    const tokenPromise = requestAccessToken();
    // ...and build the CSV in parallel while the user consents.
    const dataPromise = (async () => {
      const text = typeof csvContent === "function" ? await csvContent() : csvContent;
      const values = parseCsv(text ?? "");
      if (values.length === 0) {
        throw new Error("There is no data to export.");
      }
      return values;
    })();

    try {
      const [token, values] = await Promise.all([tokenPromise, dataPromise]);

      // Create an empty spreadsheet in the signed-in user's Drive.
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ properties: { title: fileName } }),
      });
      if (!createRes.ok) {
        throw new Error(`Could not create the spreadsheet (${createRes.status}).`);
      }
      const sheet = await createRes.json();
      const sheetTitle = sheet.sheets?.[0]?.properties?.title ?? "Sheet1";

      // Write the rows starting at A1.
      const writeRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheet.spreadsheetId}/values/${encodeURIComponent(
          `${sheetTitle}!A1`,
        )}?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values }),
        },
      );
      if (!writeRes.ok) {
        throw new Error(`Could not write to the spreadsheet (${writeRes.status}).`);
      }

      const url = sheet.spreadsheetUrl;
      if (url) {
        // The new-tab open happens after awaits, so the popup blocker may kill
        // it. If it does, fall back to showing a link the user can click.
        const opened = window.open(url, "_blank", "noopener");
        if (opened) {
          onClose();
        } else {
          setResultUrl(url);
        }
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Google Sheets export failed:", error);
      alert(error instanceof Error ? error.message : "Unable to export to Google Sheets.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative rounded-lg bg-white p-8 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <FaTimes />
        </button>

        {resultUrl ? (
          <>
            <h2 className="mb-4 text-xl font-semibold">Your Google Sheet is ready</h2>
            <p className="mb-4">Your browser blocked the new tab. Use the link below to open it.</p>
            <a
              href={resultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md bg-green-600 text-white px-4 py-2 transition hover:bg-green-700"
            >
              Open Google Sheet
            </a>
          </>
        ) : (
          <>
            <h2 className="mb-4 text-xl font-semibold">Please choose data export format</h2>
            <p className="mb-4">Select the format in which you would like to download the data.</p>

            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={downloadCsv}
                disabled={!csvContent || busy}
                className="rounded-md bg-blue-500 text-white px-4 py-2 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Working…" : "Download as CSV"}
              </button>
              <button
                type="button"
                onClick={exportToSheets}
                disabled={!csvContent || busy}
                className="rounded-md bg-green-600 text-white px-4 py-2 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Working…" : "Export to Google Sheets"}
              </button>
              {/* PDF export button to be added when downloadPDF is implemented. */}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
