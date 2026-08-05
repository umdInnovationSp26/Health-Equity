"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { FaCalendarAlt, FaTimes } from "react-icons/fa";
import { useState } from "react";
import Button from "@/app/components/button";

interface DateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Currently applied range, as "YYYY-MM-DD" strings ("" = open-ended). */
  start: string;
  end: string;
  onApply: (start: string, end: string) => void;
  onClear: () => void;
}

/**
 * Start/end date picker used to narrow the events list to a window. Either side
 * may be left blank for an open-ended range (e.g. "everything after June 1").
 */
export default function DateRangeModal({
  isOpen,
  onClose,
  start,
  end,
  onApply,
  onClear,
}: DateRangeModalProps) {
  // Edit a local copy so cancelling out of the modal leaves the list untouched.
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);

  // Re-seed the draft each time the modal opens so it always reflects the range
  // that's actually applied. Adjusted during render rather than in an effect —
  // React re-runs the render immediately, without a visible intermediate paint.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setDraftStart(start);
      setDraftEnd(end);
    }
  }

  const isInvalid = Boolean(draftStart && draftEnd && draftStart > draftEnd);

  const handleApply = () => {
    if (isInvalid) return;
    onApply(draftStart, draftEnd);
    onClose();
  };

  const handleClear = () => {
    setDraftStart("");
    setDraftEnd("");
    onClear();
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      transition
      className="relative z-50 focus:outline-none"
    >
      <div className="fixed inset-0 bg-black/40 transition duration-300 data-[closed]:opacity-0" />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl duration-300 ease-out data-[closed]:transform data-[closed]:opacity-0 data-[closed]:scale-95"
          >
            <div className="flex items-center justify-between mb-4">
              <DialogTitle
                as="h3"
                className="text-xl font-bold text-slate-900 flex items-center gap-2"
              >
                <FaCalendarAlt className="text-blue-600" />
                Filter by Date Range
              </DialogTitle>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition hover:cursor-pointer"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <p className="text-slate-500 mb-6">
              Show only events that start within this window. Leave either field
              blank for an open-ended range.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="range-start"
                  className="text-sm font-bold text-slate-400 tracking-widest px-1"
                >
                  From
                </label>
                <input
                  id="range-start"
                  type="date"
                  value={draftStart}
                  max={draftEnd || undefined}
                  onChange={(e) => setDraftStart(e.target.value)}
                  className="w-full cursor-pointer rounded-lg bg-gray-100 p-3 text-slate-600 outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="range-end"
                  className="text-sm font-bold text-slate-400 tracking-widest px-1"
                >
                  To
                </label>
                <input
                  id="range-end"
                  type="date"
                  value={draftEnd}
                  min={draftStart || undefined}
                  onChange={(e) => setDraftEnd(e.target.value)}
                  className="w-full cursor-pointer rounded-lg bg-gray-100 p-3 text-slate-600 outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>

            {isInvalid && (
              <p className="text-sm text-red-600 mt-3 px-1">
                The end date must be on or after the start date.
              </p>
            )}

            <div className="flex justify-end gap-2 mt-8">
              <Button
                variant="secondary"
                onClick={handleClear}
                disabled={!draftStart && !draftEnd && !start && !end}
              >
                Clear
              </Button>
              <Button variant="primary" onClick={handleApply} disabled={isInvalid}>
                Apply
              </Button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
