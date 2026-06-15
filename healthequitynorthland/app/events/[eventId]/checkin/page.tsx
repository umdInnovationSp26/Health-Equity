"use client";
import React, { use, useEffect, useState } from 'react';
import Head from "next/head";
import { FaArrowLeft } from "react-icons/fa";
import { db } from "@/app/lib/firebaseClient";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, increment, serverTimestamp, writeBatch } from "firebase/firestore";

export default function CheckInForm({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const { eventId } = use(params);
  
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [partySize, setPartySize] = useState(1);

  useEffect(() => {
    async function fetchEvent() {
      if (!eventId) return;
      const docRef = doc(db, "event", eventId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEventData(docSnap.data());
      }
    }
    fetchEvent();
  }, [eventId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventId) return alert("Event ID missing from URL")
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    let ethnicities = formData.getAll("ethnicityOrHeritage") as string[];
    const additionalValue = formData.get("additionalEthnicity") as string;

    // if 'addition' box is checked, replaces other with actual text
    if (ethnicities.includes("addition") && additionalValue) {
    ethnicities = ethnicities.filter(item => item !== "addition");
    ethnicities.push(additionalValue);
  }


    const checkInData = {
      name: name,
      email: email,
      phoneNumber: formData.get("phoneNumber"),
      age: formData.get("age"),
      zipCode: formData.get("zipCode"),
      familySize: Number(formData.get("familySize")),
      ethnicityOrHeritage: ethnicities.join(", "),
      submittedAt: serverTimestamp(),
    };

    const contactData = {
    name: name,
    email: email,
    lastActivity: serverTimestamp(),
  };


    try {
    const batch = writeBatch(db);

    const checkInRef = doc(collection(db, "event", eventId as string, "checkin"));
    batch.set(checkInRef, checkInData);

    const contactRef = doc(db, "contacts", email.toLowerCase());
    batch.set(contactRef, contactData, { merge: true });

    const eventRef = doc(db, "event", eventId as string);
    batch.update(eventRef, {
      attendees: increment(1) // Could also increase by family size?
    });
 

    // Saves to Checkin and Contacts collection
    await batch.commit();
    setFormKey(prev => prev + 1 )


  } catch (error) {
    console.error("Batch write failed:", error);
    alert("Error saving information.");
  } finally {
    setLoading(false);
  }
}

return (
  <>
    <Head>
      <title>Check-In Form | HealthEquityNorthland</title>
    </Head>

    <main className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      

      <div className="flex justify-center p-4 md:p-8 lg:p-12">
        <form
          key={formKey}
          onSubmit={handleSubmit}
          className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-12 space-y-6 md:space-y-8"
        >
          <h2 className="text-xl md:text-2xl font-bold text-center text-slate-800">{eventData?.title || "Loading Event..."} Check-In Form</h2>
           


          {/* HEN Logo */}
          <div className="flex justify-center">
            <img src="/HENsignin.png" alt="HEN Logo" className="h-16 w-auto"
            style = {{ maxWidth: '100%', height: 'auto' }} />
          </div>

          <center style={{ color: 'DodgerBlue', fontWeight: 'bold', fontSize: '2rem' }}> Welcome! </center>
          <center style={{fontSize: '1rem'}}> Please fill out the fields below to check in for the event. </center>

          {/* REQUIRED: party size */}
          <div className="flex flex-col items-center gap-4 text-center">
            <label htmlFor="familySize" className="text-sm font-semibold text-slate-700">
              How many people are in your party?
            </label>

            <div className="inline-flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm">
              <button
                type="button"
                onClick={() => setPartySize((value) => Math.max(1, value - 1))}
                className="text-xl font-semibold text-blue-600 disabled:cursor-not-allowed disabled:text-gray-300"
                disabled={partySize <= 1}
              >
                −
              </button>

              <input
                type="number"
                name="familySize"
                id="familySize"
                min={1}
                max={20}
                required
                value={partySize}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setPartySize(Number.isFinite(nextValue) && nextValue > 0 ? Math.min(20, nextValue) : 1);
                }}
                className="w-14 border-none bg-transparent text-center text-lg font-semibold text-slate-800 outline-none"
              />

              <button
                type="button"
                onClick={() => setPartySize((value) => Math.min(20, value + 1))}
                className="text-xl font-semibold text-blue-600 disabled:cursor-not-allowed disabled:text-gray-300"
                disabled={partySize >= 20}
              >
                +
              </button>
            </div>
          </div>

          {/* Submit button */}
          <div className="pt-4 flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-72 bg-blue-600 text-white font-semibold rounded-lg px-6 py-4 md:py-3 hover:bg-blue-700 transition-all shadow-md"
            >
              {loading ? "Saving..." : "Check-In"}
            </button>
          </div>


        </form>
      </div>
    </main>
  </>
);
}