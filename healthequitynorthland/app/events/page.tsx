"use client";
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import Image from 'next/image'
import calendar_svg from "@/public/calendar.svg";
import pin_svg from "@/public/pin.svg";
import { getEventType } from "@/app/lib/eventTypeUtil";
import { useRouter } from 'next/navigation';
import { convertTimestampToDate } from '@/app/lib/dateTimeUtil';

import { useEffect, useState } from "react";
import { auth, db } from "@/app/lib/firebaseClient";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";

// Define an event. These should match the fields on firebase.
interface Event {
  id: string;         
  title: string;     
  description: string;
  category: string;    
  location: string;    
  dateStart: string;
  dateEnd: string;            
  attendees: number; 
  rawTimeStart: number; // used for sorting on this page only
}  

export default function EventsPage() {
  
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState(''); // variable to store the search term 
  const [events, setEvents] = useState<Event[]>([]); // variable to store the events

  const [sortBy, setSortBy] = useState('timestampStart'); // store sort specification

  // Run this on page load and when searchbox is updated
  useEffect(() => {
    // Ordered by date in descending order, so the most future event is on top, and the oldest is on the bottom
    const q = query(collection(db, "event"), orderBy(sortBy, "desc"));

    // Grab data from the db
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();

        // Convert Firebase Timestamp to a readable string 
        const formattedStartDate = convertTimestampToDate(docData.timestampStart);
        const formattedEndDate = convertTimestampToDate(docData.timestampEnd);

        // map grabbed db variables to an event
        return {
          id: doc.id,
          title: docData.title || "Unknown",
          description: docData.description || "",
          category: getEventType(docData.category),
          location: docData.location || "TBD",
          attendees: docData.attendees || 0,
          dateStart: formattedStartDate,
          dateEnd: formattedEndDate,
          rawTimeStart: docData.timestampStart?.seconds || Number.MAX_VALUE // used for sorting after grabbing the data
        } as Event;
      });

      setEvents(data); // update the event list
    });

    return () => unsubscribe();
  }, []);


  // filter the events on the search term. Will run on load and when the searchbox is updated
  const filteredEvents = events.filter(event => {
    // If search is empty or just whitespace, show everything
    if (!searchTerm.trim()) {
      return true;
    }
    
    // Otherwise, check if title includes search term and return the searched list
    return event.title.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    if(sortBy === "title"){
      return a.title.localeCompare(b.title);
    }
    else if(sortBy === "timestampStart"){
      return b.rawTimeStart - a.rawTimeStart;
    }
    else {
      return 0; // don't sort if the sortBy variable is not working
    }
  });



  return (
    <>
      <Head>
        <title>HealthEquityNorthland</title>
        <meta name="description" content="HealthEquityNorthland" />
        <link rel="canonical" href="https://HealthEquityNorthland.org/" />
      </Head>

      <Navbar />
      <main className="min-h-screen pt-25">
        {/* Top bar with search */}
        <div className="grid grid-cols-3 gap-1 border-b-2 border-gray-200 pb-4">
            <div className="content-start px-4">
                <button className="mx-4">
                    &lt; {/* Left facing arrow*/}
                </button>
                <button onClick={() => setSortBy("timestampStart")} className="outline mx-4">
                    By Date
                </button>
                <button onClick={() => setSortBy("title")} className="outline mx-4">
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
              <span className="absolute left-4 top-4 text-gray-400">&#x1F50E;&#xFE0E;</span> {/* Magnifying glass icon */}
            </div>

            <div className="content-end">
              <button className="outline mx-4">
                    View Calendar {/* TODO: Need to connect google calendar */}
                </button>
                <button  onClick={() => router.push('/events/create')} className="outline mx-4">
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

          {/*If no events, show not found text */}
          {filteredEvents.length === 0 && (
            <p className="text-center text-gray-400 mt-10">No events found</p>
          )}
        </div>

      </main>

      <Footer />
    </>
  );
}
