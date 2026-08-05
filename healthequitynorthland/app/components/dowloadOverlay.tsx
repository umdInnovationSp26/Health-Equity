"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { GOOGLE_SCOPES, isGsiReady, loadGsi, requestAccessToken } from "@/app/lib/googleAuth";
import Button, { buttonClasses } from "@/app/components/button";
import { jsPDF } from "jspdf";

/** CSV text, or a (possibly async) function that builds it when the user clicks download. */
type CsvSource = string | (() => string | Promise<string>);

/** One headline stat shown above the table in every export format. */
export interface ExportSummaryItem {
  label: string;
  value: string;
}

/** Summary stats, or a (possibly async) function that computes them on click. */
type SummarySource =
  | ExportSummaryItem[]
  | (() => ExportSummaryItem[] | Promise<ExportSummaryItem[]>);

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Parse the CSV produced for download back into rows for the Sheets API
 * (and now also for the PDF report table).
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
  /**
   * Optional headline stats (e.g. distribution totals) rendered above the table
   * in the PDF and prepended as label/value rows in the CSV and Google Sheet.
   */
  summary?: SummarySource;
  /** Base file name (without extension) used for the downloaded file. */
  fileName?: string;
}

/* ------------------------------------------------------------------ */
/* Create Check-In PDF report                                          */
/* ------------------------------------------------------------------ */

interface YesNoTally {
  /** Header label with any "Took:" prefix stripped, e.g. "Produce". */
  label: string;
  /** Rows that answered yes. */
  yes: number;
  /** Rows that answered either yes or no (blanks excluded). */
  answered: number;
}

/**
 * Tallies every yes/no column separately, so the report shows how many people
 * said yes to each question rather than a single combined total.
 *
 * Column selection: if the CSV has any "Took: <item>" columns (what the
 * check-in export emits for tracked supplies) only those are counted. Otherwise
 * every column whose filled-in values are all recognizably yes/no is counted,
 * which covers exports that name their boolean columns differently.
 *
 * Blank cells are excluded from both `yes` and `answered`, so partially-filled
 * sheets don't skew the totals.
 */
function countYesPerColumn(header: string[], body: string[][]): YesNoTally[] {
  const normalize = (v: string) => v.trim().toLowerCase();
  const isYes = (v: string) => ["yes", "y", "true", "1"].includes(normalize(v));
  const isNo = (v: string) => ["no", "n", "false", "0"].includes(normalize(v));

  /** Returns the tally for a column, or null if it isn't a yes/no column. */
  const tally = (colIndex: number): YesNoTally | null => {
    let yes = 0;
    let answered = 0;
    for (const row of body) {
      const val = (row[colIndex] ?? "").trim();
      if (!val) continue;
      if (isYes(val)) {
        yes++;
        answered++;
      } else if (isNo(val)) {
        answered++;
      } else {
        return null; // not a yes/no column
      }
    }
    if (answered === 0) return null;
    const raw = (header[colIndex] ?? "").trim();
    const label = raw.replace(/^took:\s*/i, "") || `Column ${colIndex + 1}`;
    return { label, yes, answered };
  };

  const trackedIdx = header
    .map((h, i) => (/^took:\s*/i.test(h ?? "") ? i : -1))
    .filter((i) => i !== -1);

  const indices = trackedIdx.length > 0 ? trackedIdx : header.map((_, i) => i);

  return indices
    .map(tally)
    .filter((entry): entry is YesNoTally => entry !== null);
}

/**
 * Builds a PDF report from the same rows that get exported to CSV / Sheets.
 * First row of `rows` is treated as the header row.
 */
async function generatePDF(
  eventName: string,
  rows: string[][],
  summary: ExportSummaryItem[] = [],
) {
  // load the HEN logo
  const logoImg = new (globalThis as any).Image();
  logoImg.src = "/HENsignin.png";
  logoImg.crossOrigin = "anonymous";
  await new Promise((resolve) => {
    logoImg.onload = resolve;
  });
  const logoCanvas = document.createElement("canvas");
  logoCanvas.width = logoImg.width;
  logoCanvas.height = logoImg.height;
  const logoCtx = logoCanvas.getContext("2d");
  if (logoCtx) {
    logoCtx.drawImage(logoImg, 0, 0);
  }
  const logoImage = logoCanvas.toDataURL("image/png");

  // create a new PDF document (A4 portrait, mm units by default)
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(eventName, pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Event Data Report", pageWidth / 2, 28, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, pageWidth / 2, 34, {
    align: "center",
  });
  doc.setTextColor(0);

  const marginX = 10;
  const bottomLimit = pageHeight - 55; // leave room for the logo on each page
  const usableWidth = pageWidth - marginX * 2;
  let tableTop = 42;

  // Caller-supplied headline stats (e.g. distribution totals across events),
  // one per line as "Label: Value".
  if (summary.length > 0) {
    const boxY = tableTop;
    const padding = 4;
    const lineHeight = 5.5;
    const titleHeight = 6;
    const boxHeight = summary.length * lineHeight + titleHeight + padding * 2;

    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 245);
    doc.rect(marginX, boxY, usableWidth, boxHeight, "FD");

    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Distribution Totals", marginX + padding, boxY + padding + 4);

    doc.setFontSize(10);
    summary.forEach((item, idx) => {
      const lineY = boxY + padding + titleHeight + idx * lineHeight + 4;
      doc.setFont("helvetica", "normal");
      doc.text(item.label, marginX + padding, lineY);
      doc.setFont("helvetica", "bold");
      doc.text(item.value, pageWidth - marginX - padding, lineY, {
        align: "right",
      });
    });

    tableTop = boxY + boxHeight + 6;
  }

  // Summary box: one "yes" count per yes/no column, e.g.
  // "Produce: 12 of 30    Brochures: 5 of 30".
  if (rows.length > 0) {
    const [header, ...body] = rows;
    const tallies = countYesPerColumn(header, body);
    if (tallies.length > 0) {
      const boxY = tableTop;
      const padding = 4;
      const lineHeight = 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0);

      const summaryText = `Answered Yes — ${tallies
        .map((t) => `${t.label}: ${t.yes} of ${t.answered}`)
        .join("    ")}`;
      const lines: string[] = doc.splitTextToSize(
        summaryText,
        usableWidth - padding * 2,
      );
      const boxHeight = lines.length * lineHeight + padding * 2;

      doc.setDrawColor(200);
      doc.setFillColor(245, 245, 245);
      doc.rect(marginX, boxY, usableWidth, boxHeight, "FD");
      lines.forEach((line, idx) => {
        doc.text(line, pageWidth / 2, boxY + padding + idx * lineHeight + 3.5, {
          align: "center",
        });
      });

      tableTop = boxY + boxHeight + 6;
    }
  }

  if (rows.length === 0) {
    doc.setFontSize(12);
    doc.text("No data available.", pageWidth / 2, tableTop + 10, {
      align: "center",
    });
  } else {
    const [header, ...body] = rows;
    const colCount = Math.max(header.length, 1);
    const colWidth = usableWidth / colCount;
    const bodyRowHeight = 8;
    const headerLineHeight = 4;
    const headerPadding = 2.5;
    let y = tableTop;

    // Wrap each header onto as many lines as its full label needs, then size
    // the header row to the tallest one — labels are never truncated.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const headerLines: string[][] = header.map((h) =>
      doc.splitTextToSize(String(h ?? ""), colWidth - 2),
    );
    const headerRowHeight =
      Math.max(1, ...headerLines.map((lines) => lines.length)) *
        headerLineHeight +
      headerPadding * 2;

    const drawHeaderRow = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setFillColor(230, 230, 230);
      doc.rect(marginX, y, usableWidth, headerRowHeight, "F");
      for (let i = 0; i < colCount; i++) {
        const x = marginX + i * colWidth;
        doc.setDrawColor(200);
        doc.rect(x, y, colWidth, headerRowHeight);
        (headerLines[i] ?? [""]).forEach((line, lineIdx) => {
          doc.text(
            line,
            x + 1,
            y + headerPadding + lineIdx * headerLineHeight + 3,
          );
        });
      }
      y += headerRowHeight;
    };

    const drawBodyRow = (cells: string[]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      for (let i = 0; i < colCount; i++) {
        const x = marginX + i * colWidth;
        doc.setDrawColor(200);
        doc.rect(x, y, colWidth, bodyRowHeight);
        const raw = cells[i] ?? "";
        const fitted = doc.splitTextToSize(raw, colWidth - 2);
        doc.text(String(fitted[0] ?? ""), x + 1, y + bodyRowHeight - 2.5);
      }
      y += bodyRowHeight;
    };

    const addNewPage = () => {
      doc.addPage();
      y = 20;
      drawHeaderRow();
    };

    drawHeaderRow();
    for (const r of body) {
      if (y + bodyRowHeight > bottomLimit) {
        addNewPage();
      }
      drawBodyRow(r);
    }
  }

  // Add logo at bottom of the current (last) page
  doc.addImage(logoImage, "PNG", 5, pageHeight - 65, 100, 50);

  doc.save(`${eventName}-event-data.pdf`);
}

/**
 * Reusable "choose export format" modal. Renders on top of the current page
 * (fixed overlay, no navigation). Callers pass the CSV to hand off for download.
 */
export default function DownloadOverlay({
  isOpen,
  onClose,
  csvContent,
  summary,
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

  const resolveSummary = async (): Promise<ExportSummaryItem[]> => {
    if (!summary) return [];
    return typeof summary === "function" ? await summary() : summary;
  };

  /**
   * Summary stats as leading spreadsheet rows: a title, one label/value pair
   * per stat, then a blank row separating them from the data table.
   */
  const summaryRows = (items: ExportSummaryItem[]): string[][] =>
    items.length === 0
      ? []
      : [
          ["Distribution Totals"],
          ...items.map((item) => [item.label, item.value]),
          [],
        ];

  const downloadCsv = async () => {
    if (!csvContent || busy) return;
    setBusy(true);
    try {
      const [text, stats] = await Promise.all([
        typeof csvContent === "function" ? csvContent() : csvContent,
        resolveSummary(),
      ]);
      if (!text) return;

      const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
      const prefix = summaryRows(stats)
        .map((row) => row.map(escape).join(","))
        .join("\n");

      const blob = new Blob(["﻿" + (prefix ? `${prefix}\n${text}` : text)], {
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

  /* PDF report download — reuses the same CSV data as the CSV/Sheets export */
  const downloadPDF = async () => {
    if (!csvContent || busy) return;
    setBusy(true);
    try {
      const [text, stats] = await Promise.all([
        typeof csvContent === "function" ? csvContent() : csvContent,
        resolveSummary(),
      ]);
      const rows = parseCsv(text ?? "");
      if (rows.length === 0) {
        throw new Error("There is no data to include in the report.");
      }
      await generatePDF(fileName, rows, stats);
      onClose();
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Unable to generate PDF. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  /* Google Sheets export */
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
    if (!isGsiReady()) {
      loadGsi().catch(() => {});
      alert("Google sign-in is still loading — please click again in a moment.");
      return;
    }

    setBusy(true);
    // Open the popup FIRST (before any await, so it stays inside the gesture)
    const tokenPromise = requestAccessToken(GOOGLE_SCOPES.sheets);
    // and build the CSV in parallel while the user consents.
    const dataPromise = (async () => {
      const [text, stats] = await Promise.all([
        typeof csvContent === "function" ? csvContent() : csvContent,
        resolveSummary(),
      ]);
      const values = parseCsv(text ?? "");
      if (values.length === 0) {
        throw new Error("There is no data to export.");
      }
      return [...summaryRows(stats), ...values];
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
              className={buttonClasses("success")}
            >
              Open Google Sheet
            </a>
          </>
        ) : (
          <>
            <h2 className="mb-4 text-xl font-semibold">Please choose data export format</h2>
            <p className="mb-4">Select the format in which you would like to download the data.</p>

            <div className="flex justify-center gap-4">
              <Button onClick={downloadCsv} disabled={!csvContent || busy}>
                {busy ? "Working…" : "Download as CSV"}
              </Button>

              <Button onClick={downloadPDF} disabled={!csvContent || busy}>
                {busy ? "Working…" : "Download as PDF"}
              </Button>

              <Button variant="success" onClick={exportToSheets} disabled={!csvContent || busy}>
                {busy ? "Working…" : "Export to Google Sheets"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
