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
import { useQRCode } from "next-qrcode";

import { useEffect, useState, use, useRef } from "react";
import { db } from "@/app/lib/firebaseClient";
import { deleteDoc, doc, getDoc, getDocs, collection } from "firebase/firestore";
import { Event, mapDocToEvent } from "@/app/lib/eventInterface";
import { getDateOnlyString, getTimeOnlyString } from "@/app/lib/dateTimeUtil";

import { useRouter } from "next/navigation";
import { generateIcsString, triggerIcsDownload } from "@/app/lib/calendarUtil";
import DeleteConfirmationModal from "@/app/components/deleteModal";
import DownloadOverlay from "@/app/components/dowloadOverlay";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from "chart.js";

import QRCode from 'qrcode';
import { jsPDF } from "jspdf";
import { CheckInFieldOptions } from "@/app/lib/check-in-fields";
import { CheckInTrackableOptions } from "@/app/lib/check-in-trackable-data";

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

type ProduceStat = {
  name: string;
  lbs: number;
};


{/* Create Check-In PDF */}

async function generateCheckInPDF(link: string, eventName: string) {
  //generate QR code onto a canvas
  const canvas = document.createElement("canvas");

  //draw the QR code onto the canvas
  await QRCode.toCanvas(canvas, link); 
  //get QR code as image
  const qrImage = canvas.toDataURL("image/png");

  //load the HEN logo
  const logoImg = new (globalThis as any).Image();
  logoImg.src = "/HENsignin.png";
  logoImg.crossOrigin = "anonymous";
  await new Promise((resolve) => {
    logoImg.onload = resolve;
  });
  const logoCanvas = document.createElement("canvas");
  logoCanvas.width = logoImg.width;
  logoCanvas.height = logoImg.height;
  const logoCtx = logoCanvas.getContext("2d");
  if (logoCtx) {
    logoCtx.drawImage(logoImg, 0, 0);
  }
  const logoImage = logoCanvas.toDataURL("image/png");

  //create a new PDF document
  const doc = new jsPDF();
  
  // Add logo at bottom
  doc.addImage(logoImage, "PNG", 5, 235, 100, 50);
  
  //event name and "Check-In Here" text
  doc.setFontSize(40);
  doc.setFont("helvetica", "bold");
  doc.text(eventName, 105, 40, { align: "center" });

  doc.setFontSize(50);
  doc.text("Check-In Here", 105, 65, { align: "center" });


  // doc.text("Check In Here", 105, 50, { align: "center" });
  doc.addImage(qrImage, "PNG", 45, 80, 120, 120); // centered QR code
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#1E90FF");
  doc.text(link || "https://health-equity-northland.org", 105, 195, { align: "center" });

  doc.save(`${eventName}-checkin.pdf`);
}


function CheckInQRCode({ link, eventName }: { link?: string; eventName?: string }) {
  const { Canvas } = useQRCode();

  return (

    
    
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
      <div className="flex justify-center">
            <img src="/HENsignin.png" alt="HEN Logo" className="h-16 w-auto"
            style = {{ maxWidth: '100%', height: 'auto' }} />
      </div>
            
      <div className="max-w-full text-xs text-slate-500">
      {link ? (
        <>
          
          <p style={{ color: 'black', fontSize: '14px', fontWeight: 'bold' }}>Scan this QR code for the {eventName || "this"} check-in page.</p>
        </>
      ) : (
        <p>No check-in link provided for this event.</p>
      )}
    </div>
    
      <Canvas
        text={link?.trim() || "https://health-equity-northland.org"}
        options={{
          type: "image/jpeg",
          quality: 0.3,
          errorCorrectionLevel: "M",
          margin: 3,
          scale: 4,
          width: 180,
          color: {
            dark: "#0F172A",
            light: "#FFFFFF",
          },
        }}
      />

      <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="block max-w-full break-all text-blue-500 hover:underline"
          style={{ color: 'DodgerBlue', fontSize: '10px' }}>
            {link}
          </a>


    <div className="Button">  
      <button
        onClick={() => generateCheckInPDF(link || "", eventName || "Event")}
        className="mt-2 px-3 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition hover:cursor-pointer"
      >
        Download Check-In PDF
      </button>
    </div>


    </div>

  );
}

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
    <div className="flex flex-col sm:flex-row items-center gap-4">
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

  const [event, setEventData] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [produce, setProduce] = useState<ProduceStat[]>([]);
  // How many check-ins reported taking each trackable item, keyed by label
  const [trackingTotals, setTrackingTotals] = useState<Record<string, number>>({});
  const [totalCheckIns, setTotalCheckIns] = useState(0);
  // Number of people (summed party sizes) whose check-in reported taking produce
  const [produceTakers, setProduceTakers] = useState(0);

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

  // Tally which trackable items attendees reported taking across all check-ins
  useEffect(() => {
    if (!eventId) return;

    getDocs(collection(db, "event", eventId, "checkin")).then((snap) => {
      const totals: Record<string, number> = {};
      let produceCount = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        const tracked = data.trackedItems;
        if (tracked && typeof tracked === "object") {
          Object.entries(tracked).forEach(([label, taken]) => {
            if (taken) totals[label] = (totals[label] ?? 0) + 1;
          });
          // Count actual people (party size) who took produce
          if (tracked["Produce"]) {
            produceCount += Number(data.familySize) || 1;
          }
        }
      });
      setTrackingTotals(totals);
      setTotalCheckIns(snap.size);
      setProduceTakers(produceCount);
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

  // Trackable items the coordinator chose to collect at check-in.
  // Built-in options first, then any custom "Other" labels.
  const trackableLabels: string[] = [
    ...CheckInTrackableOptions.filter(
      (option) => option.key !== "other" && event.trackableFields?.includes(option.key),
    ).map((option) => option.label),
    ...(event.trackableFields?.includes("other")
      ? (event.customTrackableFields?.length ?? 0) > 0
        ? event.customTrackableFields!
        : ["Other Supplies"]
      : []),
  ];

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

  // Builds the check-in CSV as a string. Thrown errors surface to the caller
  // (the download overlay), which shows the message to the user.
  const buildCheckInCsv = async (): Promise<string> => {
    if (!eventId) {
      throw new Error("Unable to load check-in data: missing event ID.");
    }

    const snap = await getDocs(collection(db, "event", eventId, "checkin"));
    if (snap.empty) {
      throw new Error("No check-in records found for this event.");
    }

    const enabledFields: string[] = Array.isArray(event.checkInFields)
        ? event.checkInFields
        : [];

      // Labels for the coordinator's custom "Other" fields (fallback to a single "Other")
      const customFieldLabels: string[] =
        Array.isArray(event.customCheckInFields) && event.customCheckInFields.length > 0
          ? event.customCheckInFields
          : [event.otherFieldLabel || "Other"];

      const headers = [
        "Party Size",
        ...enabledFields.flatMap((key: string) => {
          if (key === "other") return customFieldLabels;
          if (key === "raceEthnicity") return ["Race/Ethnicity"];
          if (key === "phoneNumber") return ["Phone Number"];
          if (key === "zipCode") return ["Zip Code"];
          if (key === "name") return ["Full Name"];
          if (key === "email") return ["Email Address"];
          return [key];
        }),
        ...trackableLabels.map((label) => `Took: ${label}`),
      ];

      const escapeCsvValue = (value: unknown) => {
        if (value === null || value === undefined) return "";
        const text = Array.isArray(value)
          ? value.join("; ")
          : String(value);
        const escaped = text.replace(/"/g, '""');
        return `"${escaped}"`;
      };

      const rows = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        const rowValues: unknown[] = [data.familySize ?? ""];

        enabledFields.forEach((key) => {
          if (key === "other") {
            customFieldLabels.forEach((label) => {
              rowValues.push(data.customFields?.[label] ?? "");
            });
            return;
          }

          if (key === "raceEthnicity") {
            rowValues.push(data.raceEthnicity ? (Array.isArray(data.raceEthnicity) ? data.raceEthnicity.join("; ") : data.raceEthnicity) : "");
            return;
          }

          const rawValue = data[key as keyof typeof data];
          rowValues.push(rawValue ?? "");
        });

        // One column per tracked item: whether this check-in reported taking it
        trackableLabels.forEach((label) => {
          rowValues.push(data.trackedItems?.[label] ? "Yes" : "No");
        });

        return rowValues.map(escapeCsvValue).join(",");
      });

    return [headers.map(escapeCsvValue).join(","), ...rows].join("\n");
  };

  const downloadCalendarFile = () => {
    const ics = generateIcsString([event]);
    triggerIcsDownload(ics, `${event.title || "event"}`);
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />

      <main className="pt-20 min-h-screen">
        <div className="relative flex flex-col items-center justify-between bg-white p-4 shadow-sm sm:h-16 sm:flex-row sm:gap-2">

          {/* Back arrow and event details title */}
          <div className="relative flex min-h-[40px] w-full items-center sm:static sm:w-auto">
            <div className="z-20">
              <button
                onClick={() => router.push("/events")}
                className="hover:cursor-pointer p-2 transition hover:scale-105"
              >
                <FaArrowLeft />
              </button>
            </div>

            <h3 className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap font-bold text-slate-800">
              Event Details
            </h3>
          </div>

          {/* right buttons */}
          <div className="z-20 mt-3 flex w-full flex-shrink-0 flex-wrap items-center justify-center gap-2 sm:mt-0 sm:w-auto sm:flex-nowrap sm:justify-end sm:pr-4">


            {/* Export Event Specific Data */}
             <button
              onClick={() => setIsDownloadOpen(true)}
              className="flex items-center gap-2 whitespace-nowrap rounded-sm bg-blue-100 px-3 py-2 font-medium text-xs text-blue-700 transition hover:cursor-pointer hover:scale-105 sm:px-4 sm:text-sm lg:text-base"
            >
              Download Event Data
            </button>


            <button
              onClick={downloadCalendarFile}
              className="flex items-center gap-2 whitespace-nowrap rounded-sm bg-blue-100 px-3 py-2 font-medium text-xs text-blue-700 transition hover:cursor-pointer hover:scale-105 sm:px-4 sm:text-sm lg:text-base"
            >
              Download (.ics)
            </button>


            {/* Dropdown */}
            <div className="relative w-full sm:w-35">
              <Menu>
                <MenuButton className="inline-flex w-full items-center justify-between rounded-sm bg-blue-500 px-4 py-2 text-sm md:text-md font-medium text-white transition-all hover:cursor-pointer hover:scale-105 active:scale-95 lg:py-2 lg:text-base">
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
                    className="absolute right-0 z-50 w-full rounded-b-lg border border-t-0 border-gray-200 bg-white shadow-xl focus:outline-none"
                  >
                    <div className="flex flex-col">
                      <MenuItem>
                        <Link
                          href={`/events/${eventId}/counter`}
                          className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-gray-50"
                        >
                          Counter
                          <span className="text-gray-400">›</span>
                        </Link>
                      </MenuItem>

                      <MenuItem>
                        <Link
                          href={`/events/${eventId}/checkin`}
                          className="flex w-full items-center justify-between px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-gray-50"
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

        <div className="min-h-screen max-w-6xl mx-auto pt-6 sm:pt-10 px-4 sm:px-6">
          {/* Top Header Section */}
          <div className="flex flex-col items-center mb-5 relative">
            <span className="px-6 py-1 bg-indigo-100 text-indigo-600 rounded-full text-sm font-medium mb-4">
              {event.category}
            </span>

            <div className="flex items-center gap-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 text-center px-2">
                {event.title}
              </h1>

            </div>

            <div className="mt-3 flex sm:mt-0 sm:absolute sm:top-0 sm:right-0 sm:pt-0">
              <button
                className="mr-3 flex items-center justify-center px-4 py-2 font-bold hover:bg-gray-200 text-xl hover:cursor-pointer rounded-xl transition tracking-wider"
                onClick={() => router.push("/events/" + eventId + "/edit")}
                title="Edit"
              >
                <FaPencilAlt />
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center justify-center px-4 py-2 font-bold text-red-600 text-xl hover:bg-red-50 hover:cursor-pointer rounded-xl transition tracking-wider"
                title="Delete"
              >
                <FaTrashAlt />
              </button>
            </div>
          </div>

          {/* Info Bar */}
          <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-4 sm:gap-10 text-slate-500 font-medium mb-8">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 items-start">
            {/* Gray Stats Box */}
            <div className="bg-slate-50 h-full rounded-3xl p-6 sm:p-8 gap-y-8 gap-x-4 shadow-sm border border-gray-100">
              <div className="flex flex-col items-center">
                <h1 className="text-1.7xl font-bold text-slate-800">
                  Attendees
                </h1>
                <span className="text-5xl font-bold text-slate-700">
                  {event.attendees || 0}
                </span>


          <br />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
            {/* Display what data field options were selected for this event */}

            {(() => {
            
              const raw = event.checkInFields;
              const keys: string[] = Array.isArray(raw)
                ? raw
                : raw && typeof raw === "object"
                ? Object.keys(raw).filter((k) => (raw as any)[k])
                : [];

              return keys.length > 0
                ? ( <> 
                <h1 className="text-1.7xl font-bold text-slate-800">
                  Data collected:
                </h1>
                    {keys
                      .map((key: string) => CheckInFieldOptions.find((f) => f.key === key)?.label ?? key)
                      .join(", ")}
                      </>
                )
                :     
            <label htmlFor="familySize" className="text-xs font-semibold text-slate-600">
              No additional data for this event
            </label>;
            })()}
          </span>
              </div>
            </div>


            {/* Check-In QR Code */}

            {/* The QR code will only be shown if a check-in link exists for this event. */}
            {/* The link will also be displayed in text form. */}
            {event.checkInLink?.trim() ? (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
                <h2 className="mb-4 text-sm font-semibold text-slate-500">
                  Check-In QR Code
                </h2>
                <CheckInQRCode link={event.checkInLink} eventName={event.title} />
              </div>
            ) : null}

            {/* Tracking */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-500">
                Tracked Items
              </h2>

              {trackableLabels.length > 0 ? (
                <div className="space-y-3">
                  <ul className="space-y-2">
                    {trackableLabels.map((label) => (
                      <li
                        key={label}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-slate-600 capitalize">{label}</span>
                        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {trackingTotals[label] ?? 0}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="border-t border-slate-100 pt-2 text-xs text-slate-400">
                    Number of check-ins that took each item ({totalCheckIns} check-in
                    {totalCheckIns === 1 ? "" : "s"} total).
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">
                  No tracked items for this event.
                </p>
              )}

              {/* Produce per person stat */}
              {typeof event.producePerPersonLb === "number" && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-600">Produce per person</span>
                  <span className="font-semibold text-slate-800">
                    {event.producePerPersonLb} lbs
                  </span>
                </div>
                
              )}

              {/* Estimated total produce stat */}
               {typeof event.producePerPersonLb === "number" && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-600">Estimated total produce distributed</span>
                  <span className="font-semibold text-slate-800">
                    {event.producePerPersonLb * produceTakers} lbs
                  </span>
                </div>

              )}

            </div>


            {/* Produce chart */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-500">
                Produce
              </h2>
              <ProduceChart data={produce} />
            </div>

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
          <div className="mt-10 sm:mt-16 space-y-8 sm:space-y-12 border-t border-gray-100 pt-8 sm:pt-12">
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

      <DownloadOverlay
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
        csvContent={buildCheckInCsv}
        fileName={`${event.title || "event"}-checkin`}
      />

      <Footer />
    </div>
  );
}
