"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { db } from "@/app/lib/firebaseClient";
import { collection, getDocs } from "firebase/firestore";

/* ─── Produce Table ──────────────────────────────────────── */

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";

type ProduceStat = {
  name: string;
  lbs: number;
};

const columnHelper = createColumnHelper<ProduceStat>();

const produceColumns = [
  columnHelper.accessor("name", {
    header: "Produce",
    cell: (info) => <span className="font-medium text-slate-900">{info.getValue()}</span>,
  }),
  columnHelper.accessor("lbs", {
    header: "Amount (lbs)",
    cell: (info) => <span className="font-semibold text-slate-900">{info.getValue()}</span>,
  }),
];

function ProduceTable({ data }: { data: ProduceStat[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "lbs", desc: true }]);
  const [filter, setFilter] = useState("");

  const table = useReactTable({
    data,
    columns: produceColumns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500">Produce Detail</h2>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search produce..."
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-slate-100 text-left">
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="cursor-pointer select-none py-2 text-xs font-semibold text-slate-500"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td colSpan={2} className="py-4 text-center text-xs text-slate-400">
                No matching produce.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AddRemove() {
  const router = useRouter();
  const [produce, setProduce] = useState<ProduceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const isExitingRef = useRef(false);
  const hasExitedRef = useRef(false);


  const handleExit = useCallback(
  (alreadyNavigatedBack: boolean = false) => {
    if (hasExitedRef.current) {
      // Exit already confirmed via the button (or a prior popstate) — 
      // don't prompt again, just let the navigation complete.
      return true;
    }

    if (isExitingRef.current) {
      return true;
    }

    isExitingRef.current = true;
    setIsExiting(true);

    const shouldLeave = window.confirm(
      "Are you sure you want to exit this page? Any unsaved changes will be lost."
    );

    isExitingRef.current = false;
    setIsExiting(false);

    if (shouldLeave) {
      hasExitedRef.current = true;
      window.history.go(alreadyNavigatedBack ? -1 : -2);
      return true;
    }

    if (alreadyNavigatedBack) {
      window.history.pushState(null, "", window.location.href);
    }

    return false;
  },
  []
);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = () => {
  if (hasExitedRef.current) {
    return; 
  }
  handleExit(true);
};
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [handleExit]);
  useEffect(() => {
    const loadProduce = async () => {
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

        setProduce(loaded);
      } catch (err) {
        console.error("Error loading produce:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProduce();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <button
        type="button"
        onClick={() => handleExit(false)}
        disabled={isExiting}
        aria-label="Exit page"
        className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ×
      </button>

      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Add/Remove Produce</h1>
          <p className="mt-2 text-sm text-slate-600">This is the Add/Remove Produce page.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading produce...
          </div>
        ) : (
          <ProduceTable data={produce} />
        )}
      </div>
    </div>
  );
}