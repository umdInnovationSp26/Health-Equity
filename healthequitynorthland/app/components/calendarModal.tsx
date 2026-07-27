"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { FaEye, FaEyeSlash,FaDownload, FaTimes, FaCalendarAlt, FaCheck, FaCopy } from "react-icons/fa";
import { generateIcsString, triggerIcsDownload } from "@/app/lib/calendarUtil";
import { Event } from "@/app/lib/eventInterface";
import { useEffect, useState } from "react";
import Link from 'next/link';
import Button from "@/app/components/button";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  allEvents: Event[];
}

export default function DownloadEventsModal({ isOpen, onClose, allEvents }: DownloadModalProps) {
  const [copied, setCopied] = useState(false);
  const [subscribeUrl, setSubscribeUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);

  // Ensure window.location is only accessed on the client
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Construct URL with the public token
      const token = process.env.NEXT_PUBLIC_CALENDAR_TOKEN;
      const url = `${window.location.origin}/api/calendar/feed?token=${token}`;
      setSubscribeUrl(url);
    }
  }, []);


  const handleDownload = () => {
    const ics = generateIcsString(allEvents);
    triggerIcsDownload(ics, "Events");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(subscribeUrl);
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

            <p className="text-slate-500 mb-6 pt-5">
              Download a .ics file and upload all events to a calendar at once.
            </p>
            <p className="text-slate-500 mb-6 pb-5">
              Or, subscribe to these events through Google Calendar to get automatic updates when an event changes (takes up to 24 hours).
            </p>

            <div className="space-y-6">
              <div>
                <Button
                  onClick={handleDownload}
                  variant="primary"
                  className="w-full"
                >
                  <FaDownload />
                  Download .ics File
                </Button>
              </div>

              <div className="space-y-2 pt-3">
                <label className="text-sm font-bold text-slate-400 tracking-widest px-1">
                    Subscription Link
                </label>

                <div className="group flex items-center bg-slate-100 border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-300 transition-all">
                  {/* The input type toggles between 'password' and 'text' */}
                  <input 
                    type={showUrl ? "text" : "password"}
                    readOnly
                    value={subscribeUrl}
                    className="flex-grow bg-transparent px-4 py-3 text-slate-500 font-medium outline-none cursor-default"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  
                  <div className="flex items-center gap-1 pr-1">
                    {/* Visibility Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowUrl(!showUrl)}
                      className="p-2.5 text-slate-400 hover:text-slate-600 transition-colors hover:cursor-pointer"
                      title={showUrl ? "Hide URL" : "Show URL"}
                    >
                      {showUrl ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>

                    {/* Copy Button */}
                    <button 
                      onClick={handleCopyLink}
                      className={`p-2.5 rounded-lg transition-all duration-200 hover:cursor-pointer ${
                        copied 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-white text-blue-600 hover:bg-slate-200 hover:border-slate-300 border border-slate-200 shadow-sm'
                      }`}
                      title="Copy Link"
                    >
                      {copied ? <FaCheck size={14} /> : <FaCopy size={14} />}
                    </button>
                  </div>
                </div>

            
                <p className="text-sm text-slate-400 px-1 italic pb-5">
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