"use client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaAngleDown } from "react-icons/fa";
import Button from "@/app/components/button";
import { db } from "@/app/lib/firebaseClient";
import {
  collection,
  doc,
  getDocs,
  increment,
  writeBatch,
} from "firebase/firestore";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";

/* ─── Data & Firestore helpers ───────────────────────────── */

type ProduceStat = {
  name: string;
  lbs: number;
};

/** A produce row merged with its not-yet-submitted delta. */
type DraftProduceStat = ProduceStat & {
  /** Net pending change for this item, 0 if untouched. */
  delta: number;
  /** lbs + delta — what should actually be shown on screen. */
  displayLbs: number;
};

const MANUAL_EVENT_ID = "manual-adjustments";

/** Commits every pending delta in one atomic batch write. */
async function submitDeltas(deltas: Record<string, number>) {
  const entries = Object.entries(deltas).filter(([, delta]) => delta !== 0);
  if (entries.length === 0) return;

  const batch = writeBatch(db);

  // Ensures "manual-adjustments" shows up when loadProduce() lists documents
  // in "event" via getDocs, which only returns docs that actually exist.
  batch.set(doc(db, "event", MANUAL_EVENT_ID), { isManualAdjustments: true }, { merge: true });

  for (const [name, delta] of entries) {
    const ref = doc(db, "event", MANUAL_EVENT_ID, "produce", name);
    batch.set(ref, { lb: increment(delta) }, { merge: true });
  }

  await batch.commit();
}

const QUICK_DELTAS = [-10, -5, -1, 1, 5, 10];

const columnHelper = createColumnHelper<DraftProduceStat>();

const produceColumns = [
  columnHelper.accessor("name", {
    header: "Produce",
    cell: (info) => {
      const delta = info.row.original.delta;
      return (
        <span className="inline-flex items-center gap-2">
          <span className="font-medium text-slate-900">{info.getValue()}</span>
          {delta !== 0 && (
            <span
              className={`text-xs font-semibold rounded-full px-1.5 py-0.5 ${
                delta > 0 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
              }`}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </span>
      );
    },
  }),
  columnHelper.accessor("displayLbs", {
    header: "Amount (lbs)",
    cell: (info) => <span className="font-semibold text-slate-900">{info.getValue()}</span>,
  }),
];

/* ─── Desktop table (click a row to expand its edit controls) ── */

function ProduceTable({
  rows,
  filter,
  onFilterChange,
  sortKey,
  sortDesc,
  onSortChange,
  onAdjust,
  onSetExact,
  disabled,
}: {
  rows: DraftProduceStat[];
  filter: string;
  onFilterChange: (f: string) => void;
  sortKey: "name" | "lbs";
  sortDesc: boolean;
  onSortChange: (key: "name" | "lbs") => void;
  onAdjust: (name: string, delta: number) => void;
  onSetExact: (name: string, currentDisplayLbs: number, desired: number) => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");

  // Rows arrive already sorted/filtered by the parent (sorted against base
  // lbs/name, not the live displayLbs) — this table only needs core row
  // model to get flexRender-compatible row/cell objects out of it.
  const table = useReactTable({
    data: rows,
    columns: produceColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const startEdit = (row: DraftProduceStat) => {
    if (expanded === row.name) {
      setExpanded(null);
      return;
    }
    setExpanded(row.name);
    setDraftValue(String(row.displayLbs));
  };

  const sortArrow = (key: "name" | "lbs") => (sortKey === key ? (sortDesc ? " ↓" : " ↑") : "");

  return (
    <div className="hidden md:block rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500">Produce Detail</h2>
        <input
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Search produce..."
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left">
            <th
              onClick={() => onSortChange("name")}
              className="cursor-pointer select-none py-2 text-xs font-semibold text-slate-500"
            >
              Produce{sortArrow("name")}
            </th>
            <th
              onClick={() => onSortChange("lbs")}
              className="cursor-pointer select-none py-2 text-xs font-semibold text-slate-500"
            >
              Amount (lbs){sortArrow("lbs")}
            </th>
            <th className="py-2 text-xs font-semibold text-slate-500 w-8" />
          </tr>
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const isOpen = expanded === row.original.name;
            return (
              <Fragment key={row.id}>
                <tr
                  onClick={() => startEdit(row.original)}
                  className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  <td className="py-2 text-right text-slate-400">{isOpen ? "︿" : "﹀"}</td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td colSpan={3} className="py-4 px-2">
                      <div className="flex flex-wrap items-end gap-6">
                        <div>
                          <label className="text-xs text-slate-500">Exact amount (lbs)</label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="number"
                              inputMode="decimal"
                              value={draftValue}
                              disabled={disabled}
                              onChange={(e) => setDraftValue(e.target.value)}
                              className="w-32 h-9 rounded-lg border border-slate-200 px-3 text-sm disabled:opacity-50"
                            />
                            <Button
                              type="button"
                              variant="success"
                              disabled={disabled}
                              onClick={() => {
                                const parsed = parseFloat(draftValue);
                                if (!Number.isNaN(parsed)) {
                                  onSetExact(row.original.name, row.original.displayLbs, parsed);
                                }
                              }}
                            >
                              Set
                            </Button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Quick Adjust</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {QUICK_DELTAS.map((delta) => (
                              <button
                                key={delta}
                                type="button"
                                disabled={disabled}
                                onClick={() => onAdjust(row.original.name, delta)}
                                className={`h-9 px-3 rounded-lg border text-sm font-medium disabled:opacity-50 ${
                                  delta < 0
                                    ? "text-red-700 border-red-200"
                                    : "text-green-700 border-green-200"
                                }`}
                              >
                                {delta > 0 ? `+${delta}` : delta}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-xs text-slate-400">
                No matching produce.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Mobile accordion list ─────────────────────────────────── */

function MobileProduceList({
  rows,
  filter,
  onFilterChange,
  sortKey,
  sortDesc,
  onSortChange,
  onAdjust,
  onSetExact,
  disabled,
}: {
  rows: DraftProduceStat[];
  filter: string;
  onFilterChange: (f: string) => void;
  sortKey: "name" | "lbs";
  sortDesc: boolean;
  onSortChange: (key: "name" | "lbs") => void;
  onAdjust: (name: string, delta: number) => void;
  onSetExact: (name: string, currentDisplayLbs: number, desired: number) => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");

  const startEdit = (row: DraftProduceStat) => {
    if (expanded === row.name) {
      setExpanded(null);
      return;
    }
    setExpanded(row.name);
    setDraftValue(String(row.displayLbs));
  };

  const sortButtonClass = (key: "name" | "lbs") =>
    `flex-1 h-9 text-sm rounded-lg border transition ${
      sortKey === key
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-white text-slate-700 border-slate-200"
    }`;

  return (

    
    <div className="md:hidden rounded-2xl border border-slate-100 bg-white overflow-hidden">

        
      <div className="p-4 border-b border-slate-100 space-y-2">

        
        <input
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Search produce..."
          className="w-full rounded-lg border border-slate-200 pl-3 pr-3 py-2 text-base"
        />
        <div className="flex gap-2">
          <button
            type="button"
            className={sortButtonClass("name")}
            onClick={() => onSortChange("name")}
          >
            Name {sortKey === "name" ? (sortDesc ? "↓" : "↑") : ""}
          </button>
          <button
            type="button"
            className={sortButtonClass("lbs")}
            onClick={() => onSortChange("lbs")}
          >
            Amount {sortKey === "lbs" ? (sortDesc ? "↓" : "↑") : ""}
          </button>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="p-6 text-center text-sm text-slate-400">No matching produce.</p>
      )}

      {rows.map((row) => {
        const isOpen = expanded === row.name;
        return (
          <div key={row.name} className="border-b border-slate-100 last:border-0">
            <button
              type="button"
              onClick={() => startEdit(row)}
              className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] text-left"
            >
              <div>
                <p className="text-[15px] font-medium text-slate-900 flex items-center gap-2">
                  {row.name}
                  {row.delta !== 0 && (
                    <span
                      className={`text-xs font-semibold rounded-full px-1.5 py-0.5 ${
                        row.delta > 0 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                      }`}
                    >
                      {row.delta > 0 ? `+${row.delta}` : row.delta}
                    </span>
                  )}
                </p>
                <p className="text-[13px] text-slate-500 mt-0.5">{row.displayLbs} lbs</p>
              </div>
              <span className="text-slate-400 text-lg">{isOpen ? "︿" : "﹀"}</span>
            </button>

            {isOpen && (
              <div className="bg-slate-50 px-4 pb-4">
                <label className="text-xs text-slate-500">Exact amount (lbs)</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={draftValue}
                    disabled={disabled}
                    onChange={(e) => setDraftValue(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-base disabled:opacity-50"
                  />
                  <Button
                    type="button"
                    variant="success"
                    disabled={disabled}
                    onClick={() => {
                      const parsed = parseFloat(draftValue);
                      if (!Number.isNaN(parsed)) {
                        onSetExact(row.name, row.displayLbs, parsed);
                      }
                    }}
                    className="whitespace-nowrap"
                  >
                    Set
                  </Button>
                </div>

                <label className="text-xs text-slate-500 mt-3 block">Quick adjustment</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {QUICK_DELTAS.map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      disabled={disabled}
                      onClick={() => onAdjust(row.name, delta)}
                      className={`h-9 px-3 rounded-lg border text-sm font-medium disabled:opacity-50 ${
                        delta < 0
                          ? "text-red-700 border-red-200"
                          : "text-green-700 border-green-200"
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Add new produce form (shared, shown under both views) ── */

function AddProduceForm({
  onAdd,
  disabled,
}: {
  onAdd: (name: string, lbs: number) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  const submit = () => {
    const trimmed = name.trim();
    const parsed = parseFloat(amount);
    if (!trimmed || Number.isNaN(parsed)) return;
    onAdd(trimmed, parsed);
    setName("");
    setAmount("");
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-500 mb-3">Add new produce</h2>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={name}
          disabled={disabled}
          onChange={(e) => setName(e.target.value)}
          placeholder="Produce name"
          className="flex-1 h-10 rounded-lg border border-slate-200 px-3 text-base disabled:opacity-50"
        />
        <input
          value={amount}
          disabled={disabled}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (lbs)"
          type="number"
          inputMode="decimal"
          className="sm:w-32 h-10 rounded-lg border border-slate-200 px-3 text-base disabled:opacity-50"
        />
        <Button
          type="button"
          variant="success"
          disabled={disabled}
          onClick={submit}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

/* ─── Sticky submit bar ──────────────────────────────────────── */

function SubmitBar({
  pendingCount,
  submitting,
  onSubmit,
  onDiscard,
}: {
  pendingCount: number;
  submitting: boolean;
  onSubmit: () => void;
  onDiscard: () => void;
}) {
  if (pendingCount === 0) return null;

  return (
    <div className="sticky bottom-4 mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{pendingCount}</span>{" "}
        {pendingCount === 1 ? "change" : "changes"} not yet saved
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={submitting}
          onClick={onDiscard}
        >
          Discard
        </Button>
        <Button
          type="button"
          variant="success"
          disabled={submitting}
          onClick={onSubmit}
        >
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function AddRemove() {
  const router = useRouter();
  const [baseProduce, setBaseProduce] = useState<ProduceStat[]>([]);
  const [pendingDeltas, setPendingDeltas] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const isExitingRef = useRef(false);
  const hasExitedRef = useRef(false);

  const [sortKey, setSortKey] = useState<"name" | "lbs">("lbs");
  const [sortDesc, setSortDesc] = useState(true);
  const [filter, setFilter] = useState("");

   const handleManualExit = () => {
  router.back();
};
  
  const handlePopStateExit = () => {
  if (isExitingRef.current) return;

  window.history.go(-1);
};

     useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopStateExit);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopStateExit);
    };
  }, [router]);

  const loadProduce = useCallback(async () => {
    setLoading(true);
    try {
      const eventsSnap = await getDocs(collection(db, "event"));

      const allProduceSnaps = await Promise.all(
        eventsSnap.docs.map((eventDoc) =>
          getDocs(collection(db, "event", eventDoc.id, "produce")),
        ),
      );

      const totals: Record<string, number> = {};
      allProduceSnaps.forEach((snap) => {
        snap.docs.forEach((d) => {
          const name = d.id;
          const lb = d.data().lb ?? 0;
          totals[name] = (totals[name] ?? 0) + lb;
        });
      });

      const loaded: ProduceStat[] = Object.entries(totals)
        .map(([name, lbs]) => ({ name, lbs: Math.round(lbs * 100) / 100 }))
        .sort((a, b) => b.lbs - a.lbs);

      setBaseProduce(loaded);
    } catch (err) {
      console.error("Error loading produce:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProduce();
  }, [loadProduce]);

  // Local-only until Submit is pressed. Quick-delta buttons accumulate;
  // "Set exact" computes whatever delta closes the gap from the current
  // displayed total (base + any existing pending delta) to the typed value.
  const applyDelta = (name: string, delta: number) => {
    setPendingDeltas((prev) => ({
      ...prev,
      [name]: Math.round(((prev[name] ?? 0) + delta) * 100) / 100,
    }));
  };

  const handleAdjust = (name: string, delta: number) => applyDelta(name, delta);

  const handleSetExact = (name: string, currentDisplayLbs: number, desired: number) => {
    const delta = Math.round((desired - currentDisplayLbs) * 100) / 100;
    if (delta !== 0) applyDelta(name, delta);
  };

  const handleAddNew = (name: string, lbs: number) => applyDelta(name, lbs);

  const pendingCount = useMemo(
    () => Object.values(pendingDeltas).filter((d) => d !== 0).length,
    [pendingDeltas],
  );

  const handleDiscard = () => setPendingDeltas({});

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitDeltas(pendingDeltas);
      setPendingDeltas({});
      await loadProduce(); // pulls fresh totals; base order updates only now
    } catch (err) {
      console.error("Error submitting produce changes:", err);
      window.alert("Something went wrong submitting your changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Merge base data with pending deltas, including brand-new items that
  // don't exist in baseProduce yet. Sort key is the ORIGINAL (base) lbs/name,
  // never the live displayLbs — this is what keeps a row from jumping around
  // while you're actively adjusting it.
  const draftRows: DraftProduceStat[] = useMemo(() => {
    const baseNames = new Set(baseProduce.map((p) => p.name));
    const newNames = Object.keys(pendingDeltas).filter(
      (n) => !baseNames.has(n) && pendingDeltas[n] !== 0,
    );

    const fromBase = baseProduce.map((p) => {
      const delta = pendingDeltas[p.name] ?? 0;
      return { ...p, delta, displayLbs: Math.round((p.lbs + delta) * 100) / 100 };
    });

    const fromNew = newNames.map((name) => ({
      name,
      lbs: 0,
      delta: pendingDeltas[name],
      displayLbs: Math.round(pendingDeltas[name] * 100) / 100,
    }));

    return [...fromBase, ...fromNew];
  }, [baseProduce, pendingDeltas]);

  const sortedFilteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q ? draftRows.filter((p) => p.name.toLowerCase().includes(q)) : draftRows;

    // Sort by base lbs/name,
    const sorted = [...filtered].sort((a, b) => {
      const cmp = sortKey === "name" ? a.name.localeCompare(b.name) : a.lbs - b.lbs;
      return sortDesc ? -cmp : cmp;
    });
    return sorted;
  }, [draftRows, filter, sortKey, sortDesc]);

  const handleSortChange = (key: "name" | "lbs") => {
    if (sortKey === key) {
      setSortDesc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortDesc(key === "lbs");
    }
  };

  return (

    <>    
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <button
                    onClick={() => handleManualExit()}
                    className="p-2 hover:scale-105 transition hover:cursor-pointer"
                  >
                    <FaArrowLeft />
                  </button>

      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Add/Remove Produce</h1>
          <p className="mt-2 text-sm text-slate-600">Use this page to add or remove produce from the inventory.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading produce...
          </div>
        ) : (
          <>
            <ProduceTable
              rows={sortedFilteredRows}
              filter={filter}
              onFilterChange={setFilter}
              sortKey={sortKey}
              sortDesc={sortDesc}
              onSortChange={handleSortChange}
              onAdjust={handleAdjust}
              onSetExact={handleSetExact}
              disabled={submitting}
            />
            <MobileProduceList
              rows={sortedFilteredRows}
              filter={filter}
              onFilterChange={setFilter}
              sortKey={sortKey}
              sortDesc={sortDesc}
              onSortChange={handleSortChange}
              onAdjust={handleAdjust}
              onSetExact={handleSetExact}
              disabled={submitting}
            />
            <AddProduceForm onAdd={handleAddNew} disabled={submitting} />
            <SubmitBar
              pendingCount={pendingCount}
              submitting={submitting}
              onSubmit={handleSubmit}
              onDiscard={handleDiscard}
            />
          </>
        )}
      </div>
    </div>
    </>
  );
}



