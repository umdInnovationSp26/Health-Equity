"use client";
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import Image from 'next/image'
import calendar_svg from "@/public/calendar.svg";
import pin_svg from "@/public/pin.svg";
import { getEventType } from "@/app/lib/eventTypeUtil";

import { useEffect, useState } from "react";
import { auth, db } from "@/app/lib/firebaseClient";
import { doc, collection, query, onSnapshot, orderBy } from "firebase/firestore";

interface Event {
  id: string;         
  title: string;     
  description: string;
  category: string;    
  location: string;    
  dateStart: string;
  dateEnd: string;            
  attendees: number; 
}  

export default function EventsPage() {

  const [searchTerm, setSearchTerm] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  // TODO: REMOVE BELOW AND UNCOMMENT ABOVE WHEN DB SET UP
  // const [events, setEvents] = useState<Event[]>([
  //   {
  //     id: "111",
  //     title: "Bingo Night",
  //     description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  //     category: "Community",
  //     location: "Duluth, MN",
  //     date: "12-20-2025",
  //     attendees: 150
  //   } 
  //   ]);

  // 2. Fetch and Format Data
  useEffect(() => {
    // We order by date so upcoming events appear first
    const q = query(collection(db, "events"), orderBy("date", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();

        // Convert Firebase Timestamp to a readable string - TODO: Move to a util class
        const dateStartObj = docData.timestampStart?.toDate ? docData.timestampStart.toDate() : new Date();
        const formattedStartDate = dateStartObj.toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).replace(',', ' -');

        const dateEndObj = docData.timestampEnd?.toDate ? docData.timestampEnd.toDate() : new Date();
        const formattedEndDate = dateEndObj.toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).replace(',', ' -');

        // Manual mapping to our Event interface
        return {
          id: doc.id,
          title: docData.title || "Unknown",
          description: docData.description || "",
          category: getEventType(docData.category),
          location: docData.location || "TBD",
          attendees: docData.attendees || 0,
          dateStart: formattedStartDate,
          dateEnd: formattedEndDate
        } as Event;
      });
      
      setEvents(data);
    });

    return () => unsubscribe();
  }, []);

  // Filter Logic
  const filteredEvents = (searchTerm == "") ? events : events.filter(event =>
    event.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );



  return (
    <>
      <Head>
        <title>HealthEquityNorthland</title>
        <meta name="description" content="HealthEquityNorthland" />
        <link rel="canonical" href="https://HealthEquityNorthland.org/" />
      </Head>

      <Navbar />
      <main className="min-h-screen pt-20">
        {/* Dark overlay for contrast */}
        <div className="grid grid-cols-3 gap-1 border-b-2 border-gray-200 pb-4">
            <div className="content-start px-4">
                <button className="mx-4">
                    &lt; 
                </button>
                <button className="outline mx-4">
                    By Date
                </button>
                <button className="outline mx-4">
                    Alphabetical
                </button>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name"
                className="w-full p-4 pl-12 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-4 top-4 text-gray-400">&#x1F50E;&#xFE0E;</span>
            </div>

            <div className="content-end">
              <button className="outline mx-4">
                    View Calendar
                </button>
                <button className="outline mx-4">
                    Add New Event
                </button>
            </div>

        </div>
        
        {/* Results List */}
      <div className="flex flex-col gap-4 m-4">
        {filteredEvents.map((event) => (
          <a 
            key={event.id}
            href={`/events/${event.id}`} 
            className="flex items-center justify-between w-full p-6 bg-white border border-gray-200 rounded-xl transition-transform duration-200 hover:scale-[1.01] shadow-sm"
          >
            <div className="flex flex-col gap-2 max-w-sm">
              <span className="w-fit px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                {event.category || 'Event'}
              </span>
              <h3 className="text-xl font-bold text-slate-800">{event.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
            </div>

            <div className="flex flex-col gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Image
                  src={pin_svg}
                  width={15}
                  height={15}
                  alt="Picture of the author"
                />
                {event.location}
              </div>
              <div className="flex items-center gap-2">
                <Image
                  src={calendar_svg}
                  width={15}
                  height={15}
                  alt="Picture of the author"
                />
                {event.dateStart}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-4 min-w-[120px]">
                <span className="text-xs text-gray-500 font-medium">Attendees</span>
                <span className="text-3xl font-bold text-blue-600">{event.attendees}</span>
              </div>
              <span className="text-gray-400 text-2xl">›</span>
            </div>
          </a>
        ))}

        {filteredEvents.length === 0 && (
          <p className="text-center text-gray-400 mt-10">No events found"</p>
        )}
      </div>

      </main>

      <Footer />
    </>
  );
}
