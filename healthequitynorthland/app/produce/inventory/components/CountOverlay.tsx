"use client";

import { useEffect, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaTimes } from "react-icons/fa";
import type { ProduceStat } from "../lib/actions";

interface OverlayProps {
  item: ProduceStat;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onConfirm: (lbs: number) => void;
  onClose: () => void;
}

const CountOverlay = ({
  item,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  onConfirm,
  onClose,
}: OverlayProps) => {
  const [inputValue, setInputValue] = useState(String(item.lbs ?? 0));

  useEffect(() => {
    setInputValue(String(item.lbs ?? 0));
  }, [item.id, item.lbs]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedValue = Number(inputValue);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      return;
    }

    onConfirm(parsedValue);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Count produce
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{item.name}</h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter the updated inventory amount in pounds for this item.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close count overlay"
          >
            <FaTimes />
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Inventory total (lbs)
            <input
              type="number"
              min="0"
              step="0.1"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none ring-0 focus:border-slate-500"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
              >
                <FaArrowLeft /> Prev
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
              >
                Next <FaArrowRight />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Save & next
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CountOverlay;

