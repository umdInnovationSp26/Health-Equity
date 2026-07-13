"use client";

import { useMemo, useState } from "react";

export type ProduceStat = {
  name: string;
  lbs: number;
};

type InventoryTableProps = {
  data: ProduceStat[];
};

export default function InventoryTable({ data }: InventoryTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "lbs">("lbs");

  const visibleData = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = data.filter((item) => {
      if (!normalizedSearch) return true;
      return item.name.toLowerCase().includes(normalizedSearch);
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === "name") {
        return a.name.localeCompare(b.name);
      }

      return b.lbs - a.lbs;
    });
  }, [data, search, sortKey]);

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-slate-500">Inventory Summary</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search produce"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
          />
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as "name" | "lbs")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="lbs">Sort by lbs</option>
            <option value="name">Sort by name</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
              <th className="px-4 py-3 font-semibold">Produce</th>
              <th className="px-4 py-3 font-semibold">Total lbs</th>
            </tr>
          </thead>
          <tbody>
            {visibleData.length > 0 ? (
              visibleData.map((item) => (
                <tr key={item.name} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.lbs} lbs</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-400">
                  No produce matches your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
