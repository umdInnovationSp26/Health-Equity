"use client";
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";

import { FaArrowLeft } from "react-icons/fa";

import { useState } from "react";

import { auth, db } from "@/app/lib/firebaseClient";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { convertDateToTimestamp } from "@/app/lib/dateTimeUtil";

import * as eventTypeUtil from "@/app/lib/eventTypeUtil";

export default function CreateEvent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false); // variable for waiting for db to save data

  const eventTypeList = eventTypeUtil.getEventTypeSelect(); // list of types in int, string format to make html select options easier to create

  const [selectedType, setSelectedType] = useState<number | null>(null); // var to control which type of event is selected

  // Submit the form to the db
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleSubmit(event: any) {
    event.preventDefault();
    setLoading(true);

    // get the values
    const formData = new FormData(event.currentTarget);
    const name = formData.get("eventName") as string;
    const date = formData.get("date") as string;
    const location = formData.get("location") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const type = formData.get("eventType") as string;
    const description = formData.get("description") as string;
    const notes = formData.get("notes") as string;
    const suppliesInfo = formData.get("suppliesInformation") as string;
    const feedbackText = formData.get("eventFeedback") as string;

    try {
      // create date objects from the string data
      const combinedStartDateTime = new Date(`${date}T${startTime}`);
      const combinedEndDateTime = new Date(`${date}T${endTime}`);

      await addDoc(collection(db, "event"), {
        title: name,
        location: location,
        description: description,
        eventType: Number(type), // save the int that correlates with the event type
        attendees: 0,
        timestampStart: convertDateToTimestamp(combinedStartDateTime), // Change dates to firebase's timestamp
        timestampEnd: convertDateToTimestamp(combinedEndDateTime), // Change dates to firebase's timestamp
        notes: notes,
        suppliesInformation: suppliesInfo,
        feedbackText: feedbackText,
      });

      // Navigate to the events list page
      router.push("/events");
    } catch (error) {
      console.error(error); // print out error
      alert("Error saving event. Please try again later."); // display error popup on page
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>HealthEquityNorthland</title>
        <meta name="description" content="HealthEquityNorthland" />
        <link rel="canonical" href="https://HealthEquityNorthland.org/" />
      </Head>

      <Navbar />
      
      {/* Top bar with search */}
      <div className="pt-25 grid grid-cols-3 gap-1 border-b-2 border-gray-200 pb-4 bg-white items-center">
          <div className="content-start px-4">
              <button onClick={() => router.push('/events')} className="p-2 hover:scale-105 transition hover:cursor-pointer">
                  <FaArrowLeft />
              </button>
          </div>
          
          <h3 className="relative text-center font-bold">
            Create Event
          </h3>

      </div>

      <div className="min-h-screen bg-gray-50 flex justify-center p-4">
        <form onSubmit={handleSubmit} className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-gray-100 p-12 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Event Name
              </label>
              <input
                name="eventName"
                required
                type="text"
                className="w-full p-3 bg-gray-100 rounded-lg outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Date
              </label>
              <input
                name="date"
                required
                type="date"
                className="w-full p-3 bg-gray-100 rounded-lg outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Location
            </label>
            <input
              name="location"
              type="text"
              className="w-full p-3 bg-gray-100 rounded-lg outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Start Time
              </label>
              <input
                name="startTime"
                required
                type="time"
                className="w-full p-3 bg-gray-100 rounded-lg outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                End Time
              </label>
              <input
                name="endTime"
                required
                type="time"
                className="w-full p-3 bg-gray-100 rounded-lg outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              className="w-full p-3 bg-gray-100 rounded-lg outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Event Type
            </label>
            <select
              name="eventType"
              required
              className="w-full p-3 bg-gray-100 rounded-lg outline-none"
              onChange={(e) => {
                const val = e.target.value;
                setSelectedType(val === "" ? null : Number(val));
              }}
            >
              <option value="">Select Type</option>
              {Array.from(eventTypeList).map(([key, label]) => (
                <option key={key} value={key}>
                  {" "}
                  {label}{" "}
                </option>
              ))}
            </select>
          </div>

          {/* Outreach and tabling options */}
          {(selectedType == eventTypeUtil.getOutreachId() ||
            selectedType == eventTypeUtil.getTablingId()) && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Supplies Information
              </label>
              <textarea
                name="suppliesInformation"
                placeholder="Add any supplies information"
                rows={2}
                className="w-full p-3 bg-gray-100 rounded-lg outline-none"
              />
            </div>
          )}

          {/* Outreach only option */}
          {selectedType == eventTypeUtil.getOutreachId() && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Event Feedback
              </label>
              <textarea
                name="eventFeedback"
                rows={2}
                placeholder="Add quotes, surveys, or general feedback from the event"
                className="w-full p-3 bg-gray-100 rounded-lg outline-none"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Notes
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Add any additional notes"
              className="w-full p-3 bg-gray-100 rounded-lg outline-none"
            />
          </div>

          {/* Submit button */}
          <div className="pt-6 flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-64 bg-blue-500 text-white rounded-sm px-3 sm:px-4 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </>
  );
}
