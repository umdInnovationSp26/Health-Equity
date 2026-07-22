"use client";

import * as React from "react";
import { useState } from "react";
import { FaTimes } from "react-icons/fa";

/** CSV text, or a (possibly async) function that builds it when the user clicks download. */
type CsvSource = string | (() => string | Promise<string>);

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

        <h2 className="mb-4 text-xl font-semibold">Please choose data export format</h2>
        <p className="mb-4">Select the format in which you would like to download the data.</p>

        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!csvContent || busy}
            className="rounded-md bg-blue-500 text-white px-4 py-2 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Download as CSV"}
          </button>
          {/* PDF / Sheets export can be added here later. */}
        </div>
      </div>
    </div>
  );
}
