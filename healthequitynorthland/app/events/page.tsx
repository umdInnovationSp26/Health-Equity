"use client";
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";

import Image from 'next/image'
import { FaArrowLeft } from "react-icons/fa";

import calendar_svg from "@/public/calendar.svg";
import pin_svg from "@/public/pin.svg";
import { useRouter } from "next/navigation";
import { convertTimestampToDate } from "@/app/lib/dateTimeUtil";
import { getDateTimeString } from '@/app/lib/dateTimeUtil';
import { Event, mapDocToEvent } from '@/app/lib/eventInterface'

import { useEffect, useState } from "react";
import { auth, db } from "@/app/lib/firebaseClient";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";

export default function EventsPage() {

  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState(""); // variable to store the search term
  const [events, setEvents] = useState<Event[]>([]); // variable to store the events

  const [sortBy, setSortBy] = useState("timestampStart"); // store sort specification

  // Run this on page load and when searchbox is updated
  useEffect(() => {
    // Ordered by date in descending order, so the most future event is on top, and the oldest is on the bottom
    const q = query(collection(db, "event"), orderBy(sortBy, "desc"));

    // Grab data from the db
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => mapDocToEvent(doc.id, doc.data()))

      setEvents(data); // update the event list
    });

    return () => unsubscribe();
  }, [sortBy]);

  // filter the events on the search term. Will run on load and when the searchbox is updated
  const filteredEvents = events.filter(event => {
    // If search is empty or just whitespace, show everything
    if (!searchTerm.trim()) {
      return true;
    }

    // Otherwise, check if title includes search term and return the searched list
    return event.title.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    else if (sortBy === "timestampStart") {
      return b.rawTimeStart - a.rawTimeStart;
    }
    else {
      return 0; // don't sort if the sortBy variable is not working
    }
  });

  return (
    <>
      <Navbar />
      <main className="pt-20 min-h-screen">
        {/* Top bar with search */}
        <div className="bg-white shadow-sm flex flex-wrap items-center justify-between p-4 gap-2">
          {/* Left controls */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button className="p-2 hover:scale-105 transition">
              {" "}
              {/* Left arrow placeholder */}{" "}
            </button>
            <button
              onClick={() => setSortBy("timestampStart")}
              className="bg-gray-100 rounded-sm px-3 sm:px-4 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base"
            >
              By Date
            </button>
            <button
              onClick={() => setSortBy("title")}
              className="bg-gray-100 rounded-sm px-3 sm:px-4 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base"
            >
              Alphabetical
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search by name"
              className="w-full pl-10 p-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm sm:text-base"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              &#x1F50E;&#xFE0E; {/* Magnifying glass icon */}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button className="bg-blue-100 rounded-sm px-3 sm:px-4 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base">
              View Calendar
            </button>
            <button
              onClick={() => router.push("/events/create")}
              className="bg-blue-500 text-white rounded-sm px-3 sm:px-4 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base"
            >
              Add New Event
            </button>
          </div>
        </div>

        {/*Event cards */}
        <div className="flex flex-col gap-4 m-4">
          {filteredEvents.map((event) => (
            <a
              key={event.id}
              href={`/events/${event.id}`}
              className="flex items-center justify-between w-full p-6 bg-white border border-gray-200 rounded-xl transition-transform duration-200 hover:scale-[1.01] shadow-sm"
            >
              <div className="w-full flex flex-col gap-2 max-w-sm">
                <span className="w-fit px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                  {event.category}
                </span>
                <h3 className="text-xl font-bold text-slate-800">
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
      </main>

      <Footer />
    </>
  );
}
