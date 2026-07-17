"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaPlus, FaSearch, FaLeaf, FaTrash } from "react-icons/fa";

import {
  getProduceItems,
  submitHarvest,
  type ProduceStat,
} from "@/app/produce/inventory/lib/actions";
import CountOverlay from "@/app/produce/inventory/components/CountOverlay";

type HarvestEntry = {
  item: ProduceStat;
  lbs: number;
};

export default function ReportHarvest() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<ProduceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProduceStat | null>(null);
  const [harvestLog, setHarvestLog] = useState<HarvestEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getProduceItems()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  // Items that match search but haven't been logged yet
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) &&
        !harvestLog.some((entry) => entry.item.id === item.id),
    );
  }, [items, searchTerm, harvestLog]);

  const showCreateNew = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return false;
    const exactMatch = items.some((i) => i.name.toLowerCase() === term);
    return !exactMatch;
  }, [items, searchTerm]);

  const handleSelectItem = (item: ProduceStat) => {
    setSelectedItem(item);
    setSearchTerm("");
    setSearchFocused(false);
    searchRef.current?.blur();
  };

  const handleCreateNew = () => {
    const name = searchTerm.trim();
    if (!name) return;
    const newItem: ProduceStat = {
      id: `new-${Date.now()}`,
      name,
      lbs: 0,
      counted: false,
    };
    setSelectedItem(newItem);
    setSearchTerm("");
    setSearchFocused(false);
    searchRef.current?.blur();
  };

  const handleConfirmCount = (lbs: number) => {
    if (!selectedItem) return;
    setHarvestLog((prev) => {
      const existing = prev.findIndex((e) => e.item.id === selectedItem.id);
      if (existing !== -1) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], item: selectedItem, lbs };
        return updated;
      }
      return [...prev, { item: selectedItem, lbs }];
    });
    setSelectedItem(null);
  };

  const handleRemoveEntry = (id: string) => {
    setHarvestLog((prev) => prev.filter((e) => e.item.id !== id));
  };

  const handleSubmit = async () => {
    if (harvestLog.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await submitHarvest(
        harvestLog.map((e) => ({
          produceName: e.item.name,
          lbs: e.lbs,
        })),
      );
      setHarvestLog([]);
      router.push("/produce");
    } catch (err) {
      console.error("Failed to submit harvest", err);
      window.alert("Something went wrong submitting your harvest. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalLbs = harvestLog.reduce((sum, e) => sum + e.lbs, 0);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const showDropdown = searchFocused && searchTerm.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 active:bg-slate-200"
            aria-label="Go back"
          >
            <FaArrowLeft size={14} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-slate-900">
              Harvest Report
            </h1>
            <p className="text-xs text-slate-400">{today}</p>
          </div>

          {harvestLog.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="shrink-0 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5 pb-24 space-y-5">

        {/* ── Search / Add ── */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Add produce
          </p>

          <div className="relative">
            {/* Search input */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-100 transition">
              <FaSearch className="shrink-0 text-slate-300" size={14} />
              <input
                ref={searchRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                placeholder="Search or add produce…"
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
              />
              {searchTerm && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); setSearchTerm(""); }}
                  className="text-slate-300 hover:text-slate-500"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* Dropdown results */}
            {showDropdown && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg">
                {loading && (
                  <p className="px-4 py-3 text-sm text-slate-400">Loading…</p>
                )}

                {!loading && searchResults.map((item) => (
                  <button
                    key={item.id}
                    onMouseDown={() => handleSelectItem(item)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100 border-b border-slate-50 last:border-0"
                  >
                    <FaLeaf className="shrink-0 text-green-400" size={13} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.lbs} lbs in inventory</p>
                    </div>
                  </button>
                ))}

                {!loading && searchResults.length === 0 && !showCreateNew && (
                  <p className="px-4 py-3 text-sm text-slate-400">Already in log.</p>
                )}

                {showCreateNew && (
                  <button
                    onMouseDown={handleCreateNew}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-green-50 active:bg-green-100"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                      <FaPlus className="text-green-600" size={10} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-700">
                        Create &ldquo;{searchTerm.trim()}&rdquo;
                      </p>
                      <p className="text-xs text-slate-400">Add as new produce item</p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Harvest Log Table ── */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Today&apos;s log
            </p>
            {harvestLog.length > 0 && (
              <p className="text-xs text-slate-400">
                {harvestLog.length} item{harvestLog.length !== 1 ? "s" : ""} · {totalLbs.toFixed(1)} lbs total
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            {/* Empty state */}
            {harvestLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <FaLeaf className="text-slate-300" size={20} />
                </div>
                <p className="text-sm font-medium text-slate-500">No produce logged yet</p>
                <p className="text-xs text-slate-400">Search above to start recording your harvest.</p>
              </div>
            ) : (
              <>
                {/* Table header — hidden on smallest screens */}
                <div className="hidden grid-cols-[1fr_auto_auto] gap-4 border-b border-slate-100 px-4 py-2 sm:grid">
                  <p className="text-xs font-semibold text-slate-400">Produce</p>
                  <p className="text-xs font-semibold text-slate-400">Amount</p>
                  <p className="w-8" />
                </div>

                {/* Rows */}
                {harvestLog.map((entry) => (
                  <div
                    key={entry.item.id}
                    className="border-b border-slate-50 px-4 py-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {/* Dot indicator */}
                      <div className="h-2 w-2 shrink-0 rounded-full bg-green-400" />

                      {/* Name */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {entry.item.name}
                        </p>
                        {/* lbs shown inline on mobile */}
                        <p className="text-xs text-slate-400 sm:hidden">{entry.lbs} lbs</p>
                      </div>

                      {/* lbs — hidden on mobile (shown inline above) */}
                      <p className="hidden shrink-0 text-sm font-semibold text-slate-700 sm:block">
                        {entry.lbs} lbs
                      </p>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => setSelectedItem(entry.item)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 active:bg-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveEntry(entry.item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-400 active:bg-red-100"
                          aria-label={`Remove ${entry.item.name}`}
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total row */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500">Total</p>
                  <p className="text-sm font-bold text-slate-800">{totalLbs.toFixed(1)} lbs</p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* mobile submit button */}
      {harvestLog.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-100 bg-white px-4 py-3 sm:hidden">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-green-700 active:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Submitting…"
              : `Submit Harvest · ${harvestLog.length} item${harvestLog.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* ── Count Overlay ── */}
      {selectedItem && (
        <CountOverlay
          key={selectedItem.id}
          item={selectedItem}
          hasNext={false}
          hasPrev={false}
          onNext={() => {}}
          onPrev={() => {}}
          onConfirm={handleConfirmCount}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}