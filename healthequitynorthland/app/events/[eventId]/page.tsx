"use client";

import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";

import { FaArrowLeft, FaPencilAlt, FaTrashAlt } from "react-icons/fa";

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

import { useEffect, useState, use, useRef } from "react";
import { db } from "@/app/lib/firebaseClient";
import { deleteDoc, doc, getDoc, getDocs, collection } from "firebase/firestore";
import { mapDocToEvent } from "@/app/lib/eventInterface";
import { getDateOnlyString, getTimeOnlyString } from "@/app/lib/dateTimeUtil";

import { useRouter } from "next/navigation";
import { generateIcsString, triggerIcsDownload } from "@/app/lib/calendarUtil";
import DeleteConfirmationModal from "@/app/components/deleteModal";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from "chart.js";

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

type ProduceStat = {
  name: string;
  lbs: number;
};

/* ─── Chart colors ───────────────────────────────────────── */
const PRODUCE_COLORS = [
  "#378ADD",
  "#85B7EB",
  "#B5D4F4",
  "#185FA5",
  "#0C447C",
  "#63A3D9",
];

/* ─── Produce Chart ──────────────────────────────────────── */
function ProduceChart({ data }: { data: ProduceStat[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: data.map((d) => d.name),
        datasets: [
          {
            data: data.map((d) => d.lbs),
            backgroundColor: PRODUCE_COLORS.slice(0, data.length),
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "50%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} lbs` },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-[130px] flex-col items-center justify-center gap-1 text-center text-xs text-slate-400">
        <span>No produce data yet.</span>
        <span>
          Add produce to{" "}
          <code className="rounded bg-slate-100 px-1">[eventId]</code>.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[130px] w-[130px] flex-shrink-0">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Produce sold this month by item"
        />
      </div>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div
            key={`${item.name}-${i}`}
            className="flex items-center gap-2 text-xs text-slate-500"
          >
            <div
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ background: PRODUCE_COLORS[i] }}
            />
            <span>
              {item.name}{" "}
              <span className="font-semibold text-slate-900">
                {item.lbs} lbs
              </span>
            </span>
          </div>
        ))}
        <Link
          href="/produce"
          className="mt-1 block text-xs font-medium text-blue-500 hover:text-blue-700"
        >
          See all →
        </Link>
      </div>
    </div>
  );
}

export default function EventDetailsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const router = useRouter();

  // Unwrap the params to get the ID
  const { eventId } = use(params);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [event, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [produce, setProduce] = useState<ProduceStat[]>([]);

  // Fetch the event
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

  // Fetch produce subcollection
useEffect(() => {
  if (!eventId) return;

  getDocs(collection(db, "event", eventId, "produce")).then((snap) => {
    if (snap.empty) {
      setProduce([]);
      return;
    }

    const loaded: ProduceStat[] = snap.docs.map((d) => ({
      name: d.id,           // doc ID is the produce name
      lbs: d.data().lb,     // field is "lb", not "lbs"
    }));

    setProduce(loaded);
  });
}, [eventId]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <svg
            className="animate-spin"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Loading…
        </div>
      </div>
    );
  if (!event) return <div className="p-25 text-center">Event not found.</div>;

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "event", event.id));
      setIsDeleteModalOpen(false);
      router.push("/events"); // redirect to event list page
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event. Check your permissions.");
    }
  };

  const downloadCalendarFile = () => {
    const ics = generateIcsString([event]);
    triggerIcsDownload(ics, `${event.title || "event"}`);
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

          <div className="content-end text-right pr-4 flex items-center space-x-2 flex-shrink-0">
            <button
              className="bg-blue-100 rounded-sm px-3 sm:px-4 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base flex items-center gap-2"
              onClick={downloadCalendarFile}
            >
              Download (.ics)
            </button>
            
            {/* DROPDOWN MOVED HERE */}
            <div className="relative w-35 z-50">
              <Menu>
                <MenuButton className="inline-flex w-full justify-between items-center bg-blue-500 px-3 sm:px-4 py-2 text-sm sm:text-base font-medium hover:cursor-pointer text-white rounded-sm transition-all hover:scale-105 active:scale-95">
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
              
            </div>

            <div className="sm:absolute top-0 right-0 pt-5 sm:pt-0 flex">
              <button 
                className="mr-3 flex items-center justify-center px-4 py-2 font-bold hover:bg-gray-200 text-xl hover:cursor-pointer rounded-xl transition tracking-wider" 
                onClick={() => router.push("/events/" + eventId + "/edit")}
                title="Edit"
              >
                <FaPencilAlt/>
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center justify-center px-4 py-2 font-bold text-red-600 text-xl hover:bg-red-50 hover:cursor-pointer rounded-xl transition tracking-wider"
                title="Delete"
              >
                <FaTrashAlt/>
              </button>
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
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-500">
                Produce
              </h2>
              <ProduceChart data={produce} />
            </div>

            {/* List of Produce Items */}
            {/* List of Produce Items */}
<div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
  <h2 className="mb-4 text-sm font-semibold text-slate-500">Produce Items</h2>
  {produce.length === 0 ? (
    <p className="text-xs text-slate-400 text-center py-8">No items yet.</p>
  ) : (
    <div className="space-y-2">
      {produce.map((item, i) => {
        const total = produce.reduce((sum, p) => sum + p.lbs, 0);
        const pct = total > 0 ? Math.round((item.lbs / total) * 100) : 0;
        return (
          <div key={`${item.name}-${i}`}>
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: PRODUCE_COLORS[i % PRODUCE_COLORS.length] }}
                />
                <span>{item.name}</span>
              </div>
              <span className="font-semibold text-slate-800">
                {item.lbs} lbs
                <span className="text-slate-400 font-normal ml-1">({pct}%)</span>
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: PRODUCE_COLORS[i % PRODUCE_COLORS.length],
                }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-slate-400 pt-2 text-right">
        Total: <span className="font-semibold text-slate-600">{produce.reduce((s, p) => s + p.lbs, 0)} lbs</span>
      </p>
    </div>
  )}
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

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        eventTitle={event.title}
      />

      <Footer />
    </div>
  );
}
