"use client";
import React, { use } from 'react';
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import { FaArrowLeft } from "react-icons/fa";
import { useState } from "react";
import { db } from "@/app/lib/firebaseClient";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function CheckInForm({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const { eventId } = use(params);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventId) return alert("Event ID missing from URL")
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;


    const checkInData = {
      name: name,
      email: email,
      phoneNumber: formData.get("phoneNumber"),
      birthday: formData.get("birthday"),
      zipCode: formData.get("zipCode"),
      familySize: Number(formData.get("familySize")),
      race: formData.get("race"),
      submittedAt: serverTimestamp(),
    };

    const contactData = {
    name: name,
    email: email,
    lastActivity: serverTimestamp(),
  };


    try {
    const batch = writeBatch(db);

    // Reference for Checkin subcollection
    const checkInRef = doc(collection(db, "event", eventId as string, "checkin"));
    batch.set(checkInRef, checkInData);

    // Reference for Contacts collection
    const contactRef = doc(db, "contacts", email.toLowerCase());
    batch.set(contactRef, contactData, { merge: true });

    // Saves to Checkin and Contacts collection
    await batch.commit();
    
    router.push(`/events/${eventId}`);
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

      <Navbar />

      <main className="pt-20 min-h-screen bg-gray-50">
        {/* Header Bar */}
        <div className="bg-white shadow-sm flex items-center justify-between p-4 relative">
          <button
            onClick={() => router.back()}
            className="p-2 hover:scale-105 transition hover:cursor-pointer z-10"
          >
            <FaArrowLeft />
          </button>

          <h3 className="text-black absolute left-1/2 -translate-x-1/2 font-bold">
            Check-In Form
          </h3>
          <div className="w-10"></div> {/* Spacer for symmetry */}
        </div>

        <div className="flex justify-center p-4 sm:p-8">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 space-y-8"
          >
            <h2 className="text-2xl font-bold text-center text-slate-800">Craft Night</h2>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Name</label>
              <input
                name="name"
                required
                placeholder="Enter your name"
                type="text"
                className="w-full p-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                name="email"
                required
                placeholder="Enter your email"
                type="email"
                className="w-full p-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Phone Number</label>
              <input
                name="phoneNumber"
                required
                type="phonenumber"
                className="w-full p-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-500"
              />
            </div>

            {/* Birthday */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Birthday</label>
              <input
                name="birthday"
                required
                type="date"
                className="w-full p-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-500"
              />
            </div>

            {/* Zip Code */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Zip Code</label>
              <input
                name="zipCode"
                required
                type="zipcode"
                className="w-full p-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-500"
              />
            </div>

            {/* Race Checkboxes */}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-700">Race</label>
              <div className="space-y-2">
                {["American Indian or Alaska Native", "Asian", "Black or African American", "Hispanic or Latino", "Native Hawaiian or Other Pacific Islander", "White", "Prefer not to answer"].map((item) => (
                  <label key={item} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                    <input
                      type="checkbox"
                      name="race"
                      value={item}
                      className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                    />
                    <span className="text-slate-600">{item}</span>
                  </label>
                ))}
                
                {/* Other Option */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input type="checkbox" name="race" value="Other" className="w-5 h-5 rounded border-gray-300 text-blue-500" />
                  <span className="text-slate-600">Other:</span>
                  <input 
                    type="text" 
                    placeholder="__________" 
                    className="bg-transparent border-none outline-none flex-grow text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Family Size */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">What is your family size?</label>
              <input
                name="familySize"
                type="number"
                min="1"
                defaultValue="0"
                className="w-full p-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>

            {/* Submit button */}
            <div className="pt-6 flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-64 bg-blue-600 text-white font-semibold rounded-lg px-6 py-3 hover:bg-blue-700 hover:scale-105 transition-all shadow-md disabled:bg-gray-400"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </>
  );
}