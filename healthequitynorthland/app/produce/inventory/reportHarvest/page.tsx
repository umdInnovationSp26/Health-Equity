"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";

import { getProduceItems, type ProduceStat } from "@/app/produce/inventory/lib/actions";
import CountOverlay from "@/app/produce/inventory/components/CountOverlay";

export default function ReportHarvest() {
  const router = useRouter();
  const [items, setItems] = useState<ProduceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<ProduceStat | null>(null);
  const [enteredCounts, setEnteredCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    getProduceItems()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    if (!normalizedTerm) {
      return items;
    }

    return items.filter((item) => item.name.toLowerCase().includes(normalizedTerm));
  }, [items, searchTerm]);

  const handleConfirmCount = (lbs: number) => {
    if (!selectedItem) {
      return;
    }

    setEnteredCounts((prev) => ({
      ...prev,
      [selectedItem.id]: lbs,
    }));

    setSelectedItem(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <button
        onClick={() => router.back()}
        className="p-2 transition hover:scale-105 hover:cursor-pointer"
      >
        <FaArrowLeft />
      </button>

      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            New {new Date().toLocaleDateString()} Harvest Report
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Search for a produce item, then open the count overlay to record the amount for that single item.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-2 block">Search produce</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Type produce name..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
          </label>

          <div className="mt-4 space-y-2">
            {loading ? (
              <p className="text-sm text-slate-400">Loading produce…</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-slate-400">No matching produce found.</p>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">
                      Current inventory: {item.lbs} lbs
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-600">
                      {enteredCounts[item.id] != null
                        ? `${enteredCounts[item.id]} lbs`
                        : "Not counted"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Count
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
