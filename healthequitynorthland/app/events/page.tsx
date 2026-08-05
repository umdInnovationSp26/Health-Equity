"use client";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";

import Image from 'next/image'
import { FaArrowLeft, FaTimes } from "react-icons/fa";

import calendar_svg from "@/public/calendar.svg";
import pin_svg from "@/public/pin.svg";
import { useRouter } from "next/navigation";
import { getDateOnlyString, getDateTimeString } from '@/app/lib/dateTimeUtil';
import { Event, mapDocToEvent } from '@/app/lib/eventInterface'

import { useEffect, useState } from "react";
import { auth, db } from "@/app/lib/firebaseClient";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import DownloadEventsModal from "@/app/components/calendarModal";
import DownloadOverlay from "@/app/components/dowloadOverlay";
import type { ExportSummaryItem } from "@/app/components/dowloadOverlay";
import { CheckInTrackableOptions } from "@/app/lib/check-in-trackable-data";
import Button from "@/app/components/button";
import DateRangeModal from "@/app/components/dateRangeModal";


/** Firestore fields the list can be sorted on. */
type SortField = "timestampStart" | "title";
type SortDirection = "asc" | "desc";

/** Direction a field starts in the first time it's selected. */
const DEFAULT_SORT_DIRECTION: Record<SortField, SortDirection> = {
  timestampStart: "desc", // newest event first
  title: "asc", // A–Z
};

/** Parse a "YYYY-MM-DD" input value as local midnight (not UTC). */
function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}


export default function EventsPage() {

  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(""); // variable to store the search term
  const [events, setEvents] = useState<Event[]>([]); // variable to store the events
  const [sortBy, setSortBy] = useState<SortField>("timestampStart"); // store sort specification
  const [sortDir, setSortDir] = useState<SortDirection>("desc"); // newest / A–Z first
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rangeStart, setRangeStart] = useState(""); // "YYYY-MM-DD", "" = no lower bound
  const [rangeEnd, setRangeEnd] = useState(""); // "YYYY-MM-DD", "" = no upper bound

  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // .ics / subscribe modal
  const [isDataOpen, setIsDataOpen] = useState(false); // CSV / PDF / Sheets overlay
  const [isRangeOpen, setIsRangeOpen] = useState(false); // date range filter modal

  const isRangeActive = Boolean(rangeStart || rangeEnd);

  const clearRange = () => {
    setRangeStart("");
    setRangeEnd("");
  };

  // Human-readable summary of the applied range, for the filter chip.
  const rangeLabel = !isRangeActive
    ? ""
    : rangeStart && rangeEnd
      ? `${getDateOnlyString(parseDateInput(rangeStart))} – ${getDateOnlyString(parseDateInput(rangeEnd))}`
      : rangeStart
        ? `On or after ${getDateOnlyString(parseDateInput(rangeStart))}`
        : `On or before ${getDateOnlyString(parseDateInput(rangeEnd))}`;

  /**
   * Clicking the button for the field that's already sorted flips the
   * direction; clicking a different field switches to it using that field's
   * natural starting direction (newest first for dates, A–Z for titles).
   */
  const handleSort = (field: SortField) => {
    if (field === sortBy) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(DEFAULT_SORT_DIRECTION[field]);
    }
  };

  // Subscribe once for the life of the page. Sorting is done client-side below,
  // so putting orderBy in the query too would only mean tearing down the
  // listener and re-downloading the whole collection on every sort toggle.
  useEffect(() => {
    const q = collection(db, "event");

    // Grab data from the db. The error callback is not optional: without it a
    // failed listener (missing database, denied rules, no connectivity) is
    // swallowed silently, setLoading(false) never runs, and the page sits on
    // its spinner forever with nothing in the console to explain why.
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => mapDocToEvent(doc.id, doc.data()))

        setLoading(false);
        setLoadError(null);

        setEvents(data); // update the event list
      },
      (error) => {
        console.error("Event listener failed:", error);
        setLoadError(error.message || "Could not load events.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // filter the events on the search term and date range. Will run on load and
  // whenever the searchbox, sort, or range filter is updated
  const filteredEvents = events.filter(event => {
    // Search: keep everything when the box is empty or just whitespace
    if (searchTerm.trim() && !event.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Date range: compare against the event's start date. Either bound may be
    // blank, and the range is inclusive of both endpoints' full days.
    if (rangeStart && event.dateStart < parseDateInput(rangeStart)) {
      return false;
    }
    if (rangeEnd) {
      // Push the upper bound to the end of the selected day so events later
      // that day still match.
      const endOfDay = parseDateInput(rangeEnd);
      endOfDay.setHours(23, 59, 59, 999);
      if (event.dateStart > endOfDay) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    // Compare ascending, then flip for descending.
    let comparison: number;

    if (sortBy === "title") {
      comparison = a.title.localeCompare(b.title);
    }
    else if (sortBy === "timestampStart") {
      comparison = a.rawTimeStart - b.rawTimeStart;
    }
    else {
      return 0; // don't sort if the sortBy variable is not working
    }

    return sortDir === "asc" ? comparison : -comparison;
  });

  // Builds the attendance CSV for the download overlay. Exports exactly what's
  // on screen (current search + sort) rather than the whole collection.
  const buildEventsCsv = (): string => {
    if (filteredEvents.length === 0) {
      throw new Error("There are no events to export.");
    }

    const headers = ["Event Date", "Event Name", "Number of Attendees"];

    const escapeCsvValue = (value: unknown) => {
      if (value === null || value === undefined) return "";
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = filteredEvents.map((event) =>
      [
        event.dateStart.toLocaleDateString(),
        event.title,
        event.attendees,
      ]
        .map(escapeCsvValue)
        .join(","),
    );

    return [headers.map(escapeCsvValue).join(","), ...rows].join("\n");
  };

  /**
   * Totals distributed across the exported events. The per-event detail page
   * derives the same numbers from each event's check-in records, so this reads
   * one `checkin` subcollection per event and aggregates them the same way:
   * bags and brochures are counted per check-in, while produce is weighted by
   * party size and multiplied by the event's lbs-per-person figure.
   */
  const buildDistributionSummary = async (): Promise<ExportSummaryItem[]> => {
    const labelFor = (key: string) =>
      CheckInTrackableOptions.find((option) => option.key === key)?.label ?? key;
    const bagsLabel = labelFor("bags");
    const brochuresLabel = labelFor("brochures");
    const produceLabel = labelFor("produce");

    let bags = 0;
    let brochures = 0;
    let produceLbs = 0;

    const snapshots = await Promise.all(
      filteredEvents.map((event) =>
        getDocs(collection(db, "event", event.id, "checkin")),
      ),
    );

    snapshots.forEach((snap, index) => {
      let produceTakers = 0;

      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const tracked = data.trackedItems;
        if (!tracked || typeof tracked !== "object") return;

        if (tracked[bagsLabel]) bags++;
        if (tracked[brochuresLabel]) brochures++;
        // Produce is handed out per head, so count the whole party.
        if (tracked[produceLabel]) produceTakers += Number(data.familySize) || 1;
      });

      const perPersonLb = filteredEvents[index].producePerPersonLb;
      if (typeof perPersonLb === "number") {
        produceLbs += perPersonLb * produceTakers;
      }
    });

    return [
      { label: "Health product bags distributed", value: bags.toLocaleString() },
      { label: "Information brochures distributed", value: brochures.toLocaleString() },
      {
        label: "Produce distributed (lbs)",
        value: (Math.round(produceLbs * 100) / 100).toLocaleString(),
      },
    ];
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold text-slate-800">Could not load events</p>
          <p className="mt-2 text-sm text-slate-500">{loadError}</p>
        </div>
      </div>
    );
  }

  if (loading) {
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
  }
  
  return (
    <>
      <Navbar />
      
      <main className="pt-20 min-h-screen">
        {/* Top bar with search */}
        <div className="bg-white shadow-sm flex flex-col sm:flex-row items-center justify-between p-4 gap-4 sm:gap-2">
        
          {/* Left controls - Top row on mobile */}
          <div className="flex items-center justify-center sm:justify-start space-x-2 flex-shrink-0 w-full sm:w-auto order-1">

            <button
              onClick={() => handleSort("title")}
              title={sortBy === 'title' ? 'Click to reverse the order' : 'Sort A–Z'}
              className={`text-black rounded-sm px-3 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base ${sortBy === 'title' ? 'bg-gray-300 ' : 'bg-gray-100 '}`}
            >
              Alphabetical
              {sortBy === 'title' && (
                <span className="ml-1.5 text-xs">{sortDir === 'asc' ? '▲' : '▼'}</span>
              )}
            </button>


            <button
              onClick={() => handleSort("timestampStart")}
              title={sortBy === 'timestampStart' ? 'Click to reverse the order' : 'Sort by date, newest first'}
              className={`text-black rounded-sm px-3 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base ${sortBy === 'timestampStart' ? 'bg-gray-300' : 'bg-gray-100 '}`}
            >
              By Date
              {sortBy === 'timestampStart' && (
                <span className="ml-1.5 text-xs">{sortDir === 'asc' ? '▲' : '▼'}</span>
              )}
            </button>

            <button
              onClick={() => setIsRangeOpen(true)}
              title={isRangeActive ? 'Edit or clear the date range filter' : 'Filter events by date range'}
              className={`text-black rounded-sm px-3 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base ${isRangeActive ? 'bg-gray-300' : 'bg-gray-100 '}`}
            >
              Date Range
            </button>

          </div>

          {/* Search - Middle row on mobile */}
          <div className="relative w-full max-w-md mx-auto order-2 sm:order-2">
            <input
              type="text"
              placeholder="Search by name"
              className="text-black w-full pl-10 p-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm sm:text-base"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              &#x1F50E;&#xFE0E;
            </span>
          </div>

          {/* Right controls - Bottom row on mobile */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 flex-shrink-0 w-full sm:w-auto order-3">

            {/* Export Event Data */}

            <Button
              id="download-button"
              variant="primary"
              onClick={() => setIsDataOpen(true)}
            >
              Export Event Data
            </Button>


            <Button variant="primary" onClick={() => setIsCalendarOpen(true)}>
              Export Events to Calendar
            </Button>
            <Button
              variant="primary"
              onClick={() => router.push("/events/create")}
            >
              Add New Event
            </Button>
          </div>
        </div>

        {/* Active date-range filter, with a one-click escape hatch */}
        {isRangeActive && (
          <div className="flex justify-center px-4 pt-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-full">
              {rangeLabel}
              <button
                onClick={clearRange}
                title="Clear date range filter"
                className="text-indigo-500 hover:text-indigo-900 transition hover:cursor-pointer"
              >
                <FaTimes size={12} />
              </button>
            </span>
          </div>
        )}

        {/*Event cards */}
        <div className="flex flex-col gap-4 m-4 max-w-4xl mx-auto">
          {filteredEvents.map((event) => (
            <a
              key={event.id}
              href={`/events/${event.id}`}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full p-4 sm:p-6 bg-white border border-gray-200 rounded-xl transition-transform duration-200 hover:scale-[1.01] shadow-sm"
            >
              <div className="w-full flex flex-col gap-2 sm:max-w-sm">
                <span className="w-fit px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                  {event.category}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                  {event.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {event.description}
                </p>
              </div>

              <div className="flex flex-col gap-2 text-sm text-gray-600">
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
                  {getDateTimeString(event.dateStart)}
                </div>
              </div>

              <div className="hidden md:flex items-center gap-8">
                <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-4 min-w-[120px]">
                  <span className="text-xs text-gray-500 font-medium">
                    Attendees
                  </span>
                  <span className="text-3xl font-bold text-blue-600">
                    {event.attendees}
                  </span>
                </div>
                <span className="text-gray-400 text-2xl">›</span>
              </div>
            </a>
          ))}

          {/* If no events, show not found text */}
          {filteredEvents.length === 0 && (
            <p className="text-center text-gray-400 mt-10">No events found</p>
          )}
        </div>
        <DownloadEventsModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          allEvents={events}
        />

        <DownloadOverlay
          isOpen={isDataOpen}
          onClose={() => setIsDataOpen(false)}
          csvContent={buildEventsCsv}
          summary={buildDistributionSummary}
          fileName="AttendanceData"
        />

        <DateRangeModal
          isOpen={isRangeOpen}
          onClose={() => setIsRangeOpen(false)}
          start={rangeStart}
          end={rangeEnd}
          onApply={(start, end) => {
            setRangeStart(start);
            setRangeEnd(end);
          }}
          onClear={clearRange}
        />
      </main>

      <Footer />
    </>
  );
  }
