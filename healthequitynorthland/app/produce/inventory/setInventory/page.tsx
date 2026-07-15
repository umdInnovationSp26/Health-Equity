"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";

import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from "chart.js";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";

import {
  getProduceItems,
  submitItemCount,
  type ProduceStat,
} from "@/app/produce/inventory/lib/actions";

import CountOverlay from "@/app/produce/inventory/components/CountOverlay"

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

// Column defs and the table component are hoisted to module scope so they
// aren't redefined (and remounted) on every render of the parent.
const columnHelper = createColumnHelper<ProduceStat>();

function buildColumns(onRowClick: (id: string) => void) {
  return [
    columnHelper.accessor("name", {
      header: "Produce",
      cell: (info) => (
        <span className="font-medium text-slate-900">{info.getValue()}</span>
      ),
    }),

    columnHelper.accessor("counted", {
      header: "Counted",
      cell: (info) =>
        info.getValue() ? (
          <span className="text-green-600 font-medium">✓</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    }),

    columnHelper.accessor("lbs", {
      header: "Amount (lbs)",
      cell: (info) => (
        <span className="font-semibold text-slate-900">{info.getValue()}</span>
      ),
    }),

    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => (
        <button
          onClick={() => onRowClick(info.row.original.id)}
          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Count
        </button>
      ),
    }),
  ];
}

function ProduceTable({
  data,
  onRowClick,
}: {
  data: ProduceStat[];
  onRowClick: (id: string) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "lbs", desc: true }]);
  const [filter, setFilter] = useState("");
  const columns = buildColumns(onRowClick);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500">Inventory List</h2>
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
              <td colSpan={4} className="py-4 text-center text-xs text-slate-400">
                No matching produce.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function SetNewInventoryLevels() {
  const [items, setItems] = useState<ProduceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const router = useRouter();
  const isExitingRef = useRef(false);

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

  useEffect(() => {
    getProduceItems()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  function handleConfirmCount(itemId: string, lbs: number) {
    // optimistic local update so the UI feels instant
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, lbs, counted: true } : it))
    );

    submitItemCount(itemId, lbs).catch((err) => {
      console.error("Failed to save count", err);
      // TODO: surface a toast here and consider rolling back the optimistic update
    });
  }

  const activeItem = items.find((it) => it.id === activeItemId) ?? null;
  const activeIndex = activeItem ? items.findIndex((it) => it.id === activeItemId) : -1;

  function goToOffset(offset: number) {
    if (activeIndex === -1) return;
    const nextIndex = activeIndex + offset;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    setActiveItemId(items[nextIndex].id);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <button
        onClick={handleManualExit}
        className="p-2 hover:scale-105 transition hover:cursor-pointer"
      >
        <FaArrowLeft />
      </button>

      <div className="mx-auto max-w-4xl pt-12">
        <h1 className="text-2xl font-semibold text-slate-900">Set New Inventory Levels</h1>
        <p className="mt-2 text-sm text-slate-600">
          Adjust inventory levels for your produce here.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
            {loading ? (
              <p className="text-sm text-slate-400">Loading inventory…</p>
            ) : (
              <ProduceTable data={items} onRowClick={setActiveItemId} />
            )}
          </div>
        </div>
      </div>


          {/* Count Overlay */}
          
        {activeItem && (
          <CountOverlay
            key={activeItem.id}
            item={activeItem}
            hasNext={activeIndex < items.length - 1}
            hasPrev={activeIndex > 0}
            onNext={() => goToOffset(1)}
            onPrev={() => goToOffset(-1)}
            onConfirm={(lbs) => {
              handleConfirmCount(activeItem.id, lbs);
              goToOffset(1);
            }}
            onClose={() => setActiveItemId(null)}
          />
        )}
    </div>
  );
}