"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { FaDownload, FaTimes, FaCalendarAlt, FaCheck, FaCopy } from "react-icons/fa";
import { generateIcsString, triggerIcsDownload } from "@/app/lib/calendarUtil";
import { Event } from "@/app/lib/eventInterface"; 
import { useEffect, useState } from "react";
import Link from 'next/link';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  allEvents: Event[];
}

export default function DownloadEventsModal({ isOpen, onClose, allEvents }: DownloadModalProps) {
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  // Ensure window.location is only accessed on the client
  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const calendarDetails = `${baseUrl}/api/calendar/feed`;


  const handleDownload = () => {
    const ics = generateIcsString(allEvents);
    triggerIcsDownload(ics, "Events");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(calendarDetails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      transition // Enables the built-in transition logic
      className="relative z-50 focus:outline-none"
    >
      {/* 1. Modern Backdrop (Auto-transitions) */}
      <div className="fixed inset-0 bg-black/40 bg-black-500/80 transition duration-300 data-[closed]:opacity-0" />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          
          {/* 2. Modern DialogPanel (Auto-transitions) */}
          <DialogPanel
            transition
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl duration-300 ease-out data-[closed]:transform data-[closed]:opacity-0 data-[closed]:scale-95"
          >
            <div className="flex items-center justify-between mb-4">
              <DialogTitle as="h3" className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FaCalendarAlt className="text-blue-600" />
                Download Events
              </DialogTitle>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition hover:cursor-pointer ">
                <FaTimes size={20} />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-6">
              Download a .ics file and upload all events to a calendar at once.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Or, subscribe to these events through Google Calendar to get automatic updates when an event changes (takes up to 24 hours).
            </p>

            <div className="space-y-6">
              <div>
                <button
                  onClick={handleDownload}
                  className="flex w-full items-center justify-center gap-3 bg-blue-500 text-white rounded-sm px-3 sm:px-4 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base "
                >
                  <FaDownload />
                  Download .ics File
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    Subscription Link
                </label>
                <div className="group flex items-center bg-slate-100 border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-300 transition-all">
                    {/* Read-only input looks "inactive" but is still selectable */}
                    <input 
                    readOnly
                    value={calendarDetails}
                    className="flex-grow bg-transparent px-4 py-3 text-sm text-slate-500 font-medium outline-none cursor-default"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    
                    {/* Copy Button */}
                    <button 
                    onClick={handleCopyLink}
                    className={`m-1 p-2.5 rounded-lg transition-all duration-200 hover:cursor-pointer ${
                        copied 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-white text-blue-600 hover:bg-slate-200 hover:border-slate-300 border border-slate-200 shadow-sm'
                    }`}
                    title="Copy Link"
                    >
                    {copied ? <FaCheck size={14} /> : <FaCopy size={14} />}
                    </button>
                </div>

                <p className="text-[11px] text-slate-400 px-1 italic pb-5">
                    Paste this URL into&nbsp;
                    <Link href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" className="text-blue-600 hover:text-blue-800 font-medium underline transition-colors"> 
                        Google Calendar
                    </Link>.
                </p>
                
              </div>
            </div>
            
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}