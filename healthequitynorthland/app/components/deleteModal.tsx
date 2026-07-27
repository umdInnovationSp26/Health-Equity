"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";
import Button from "@/app/components/button";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventTitle: string;
}

export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  eventTitle 
}: DeleteConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} transition className="relative z-[60] focus:outline-none">
      {/* Grayscale Backdrop to match your export modal */}
      <div className="fixed inset-0 bg-gray-600/40 transition duration-300" aria-hidden="true" />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <div className="flex items-center justify-between mb-4">
              <DialogTitle as="h3" className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FaExclamationTriangle className="text-red-700" />
                Delete Event?
              </DialogTitle>
              <button onClick={onClose} className="hover:cursor-pointer text-slate-400 hover:text-slate-600 transition">
                <FaTimes size={20} />
              </button>
            </div>

            <div className="mt-2">
              <p className="text-sm text-slate-500 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-700">"{eventTitle}"</span>? 
                This action cannot be undone and will remove it from all synced calendars.
              </p>
            </div>

            <div className="mt-8 flex flex-row items-center justify-between w-full">
                <Button onClick={onClose} variant="secondary">
                    Cancel
                </Button>

                <Button onClick={onConfirm} variant="danger">
                    Delete Event
                </Button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}