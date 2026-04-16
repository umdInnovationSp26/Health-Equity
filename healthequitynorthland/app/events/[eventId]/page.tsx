"use client";

import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";

import { FaArrowLeft, FaPencilAlt } from "react-icons/fa";

import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import Link from "next/link";

import Image from "next/image";
import calendar_svg from "@/public/calendar.svg";
import pin_svg from "@/public/pin.svg";
import clock_svg from "@/public/clock.svg";

import { useEffect, useState, use } from "react";
import { db } from "@/app/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";
import { mapDocToEvent } from "@/app/lib/eventInterface";
import { getDateOnlyString, getTimeOnlyString } from "@/app/lib/dateTimeUtil";

import { useRouter } from "next/navigation";
import { generateIcsString, triggerIcsDownload } from "@/app/lib/calendarUtil";

export default function EventDetailsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const router = useRouter();

  // Unwrap the params to get the ID
  const { eventId } = use(params);

  const [event, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const docRef = doc(db, "event", eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const event = mapDocToEvent(eventId, docSnap.data());
          setEventData(event);
        } else {
          console.log("No such event!");
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [eventId]);

  if (loading) return <div className="p-25 text-center">Loading event...</div>;
  if (!event) return <div className="p-25 text-center">Event not found.</div>;

  const downloadCalendarFile = () => {
    const ics = generateIcsString([event]);
    triggerIcsDownload(ics, `${event.title || 'event'}`);
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />

      <main className="pt-20 min-h-screen">
        {/* Top bar with search */}
        <div className="bg-white shadow-sm flex items-center justify-between p-4 gap-2 relative">
          <div className="content-start px-4">
            <button
              onClick={() => router.push("/events")}
              className="p-2 hover:scale-105 transition hover:cursor-pointer"
            >
              <FaArrowLeft />
            </button>
          </div>

          <h3 className="absolute left-1/2 -translate-x-1/2 font-bold">
            Event Details
          </h3>

          <div className="content-end text-right pr-4">
            <button className="bg-blue-100 rounded-sm px-3 sm:px-4 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base" onClick={downloadCalendarFile}>
              Download Calendar File (.ics)
            </button>
          </div>
        </div>

        <div className="min-h-screen max-w-6xl mx-auto pt-10 px-6">
          {/* Top Header Section */}
          <div className="flex flex-col items-center mb-8 relative">
            <span className="px-6 py-1 bg-indigo-100 text-indigo-600 rounded-full text-sm font-medium mb-4">
              {event.category}
            </span>

            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold text-slate-800">
                {event.title}
              </h1>
              <button className="text-black hover:cursor-pointer hover:scale-105  hover:text-slate-600 text-2xl" onClick={() => router.push("/events/" + eventId + "/edit")}>
                <FaPencilAlt/>
              </button>
            </div>

            {/* HEADLESS UI DROPDOWN */}
            <div className="sm:absolute top-0 right-0 w-48 z-50 pt-5 sm:pt-0">
              <Menu>
                <MenuButton className="inline-flex w-full justify-between items-center bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white rounded-t-lg data-[open]:rounded-b-none rounded-b-lg transition-all focus:outline-none">
                  Track Data
                  <span className="ml-2 text-[10px] transition-transform data-[open]:rotate-180">
                    ▼
                  </span>
                </MenuButton>

                <Transition
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <MenuItems
                    static
                    className="absolute right-0 w-full bg-white border border-gray-200 border-t-0 rounded-b-lg shadow-xl focus:outline-none"
                  >
                    <div className="flex flex-col">
                      <MenuItem>
                        <Link
                          href={`/events/${eventId}/counter`}
                          className="flex w-full items-center justify-between px-4 py-3 text-sm text-slate-700 data-[focus]:bg-gray-50 transition-colors border-b border-gray-100"
                        >
                          Counter
                          <span className="text-gray-400">›</span>
                        </Link>
                      </MenuItem>

                      <MenuItem>
                        <Link
                          href={`/events/${eventId}/check-in`}
                          className="flex w-full items-center justify-between px-4 py-3 text-sm text-slate-700 data-[focus]:bg-gray-50 transition-colors"
                        >
                          Check-In Form
                          <span className="text-gray-400">›</span>
                        </Link>
                      </MenuItem>
                    </div>
                  </MenuItems>
                </Transition>
              </Menu>
            </div>
          </div>

          {/* Info Bar */}
          <div className="flex justify-center gap-10 text-slate-500 font-medium mb-12">
            <div className="flex items-center gap-2">
              <Image
                src={pin_svg}
                width={15}
                height={15}
                alt="icon for location"
              />
              {event.location}
            </div>
            <div className="flex items-center gap-2">
              <Image
                src={calendar_svg}
                width={15}
                height={15}
                alt="icon for date"
              />
              {getDateOnlyString(event.dateStart)}
            </div>
            <div className="flex items-center gap-2">
              <Image
                src={clock_svg}
                width={15}
                height={15}
                alt="icon for time"
              />
              {getTimeOnlyString(event.dateStart) +
                " - " +
                getTimeOnlyString(event.dateEnd)}
            </div>
          </div>

          {/* Dashboard Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
            {/* Gray Stats Box */}
            <div className="bg-slate-50 rounded-3xl p-8 gap-y-8 gap-x-4 shadow-sm border border-gray-100">
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                  Attendees
                </span>
                <span className="text-5xl font-bold text-slate-700">
                  {event.attendees || 0}
                </span>
              </div>
            </div>

            {/* Placeholder for Pie Chart & List */}
            <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
              Placeholder for pie chart
            </div>
          </div>

          {/* Text Sections */}
          <div className="mt-16 space-y-12 border-t border-gray-100 pt-12">
            {event.description && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  Description
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-5xl mb-8">
                  {event.description || ""}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-12">
            {event.feedbackText && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  Feedback
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-5xl">
                  {event.feedbackText || ""}
                </p>
              </div>
            )}

            {event.notes && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Notes</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-5xl">
                  {event.notes || ""}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
