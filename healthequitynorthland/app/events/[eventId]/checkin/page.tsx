"use client";
import React, { use } from 'react';
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import { FaArrowLeft } from "react-icons/fa";
import { useState } from "react";
import { db } from "@/app/lib/firebaseClient";
import { useRouter } from "next/navigation";
import { collection, doc, increment, serverTimestamp, writeBatch } from "firebase/firestore";

export default function CheckInForm({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const { eventId } = use(params);
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventId) return alert("Event ID missing from URL")
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    let ethnicities = formData.getAll("ethnicityOrHeritage") as string[];
    const otherValue = formData.get("otherEthnicity") as string;

    // if 'other' box is checked, replaces other with actual text
    if (ethnicities.includes("Other") && otherValue) {
    ethnicities = ethnicities.filter(item => item !== "Other");
    ethnicities.push(otherValue);
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

    <Navbar />

    <main className="pt-16 md:pt-20 min-h-screen bg-gray-50">
      {/* Header Bar */}
      <div className="bg-white shadow-sm flex items-center justify-between p-3 md:p-4 sticky top-0 z-20">
        <button
          onClick={() => router.back()}
          className="p-2 hover:scale-105 transition hover:cursor-pointer z-10"
        >
          <FaArrowLeft />
        </button>

        <h3 className="text-black absolute left-1/2 -translate-x-1/2 font-bold text-sm md:text-base truncate">
          Check-In Form
        </h3>
        <div className="w-10"></div> 
      </div>

      <div className="flex justify-center p-4 md:p-8 lg:p-12">
        <form
          key={formKey}
          onSubmit={handleSubmit}
          className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-12 space-y-6 md:space-y-8"
        >
          <h2 className="text-xl md:text-2xl font-bold text-center text-slate-800">Craft Night</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Name</label>
              <input name="name" required type="text" className="w-full p-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input name="email" required type="email" className="w-full p-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Phone Number */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Phone Number</label>
              <input name="phoneNumber" required type="tel" className="w-full p-3 bg-gray-100 rounded-lg outline-none" />
            </div>

            {/* Age */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Age</label>
              <input name="age" required type="number" className="w-full p-3 bg-gray-100 rounded-lg outline-none" />
            </div>

            {/* Family Size */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Family Size</label>
              <input name="familySize" required type="number" className="w-full p-3 bg-gray-100 rounded-lg outline-none" />
            </div>

            {/* Zip Code */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Zip Code</label>
              <input name="zipCode" required type="text" className="w-full p-3 bg-gray-100 rounded-lg outline-none" />
            </div>
          </div>

          {/* Ethnicity/Heritage */}
          <div className="space-y-4">
            <label className="text-sm font-semibold text-slate-700">Ethincity/Heritage</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {["American Indian/Alaskan Native", "Asian/Pacific Islander", "African American", "Hispanic/LatinX", "Euroamerican", "Prefer Not to Say"].map((item) => (
                <label key={item} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <input type="checkbox" name="ethnicityOrHeritage" value={item} className="w-5 h-5 rounded text-blue-500" />
                  <span className="text-sm text-slate-600">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Other Option */}
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <input type="checkbox" name="ethnicityOrHeritage" value="Other" className="w-5 h-5 rounded text-blue-500" />
                  <div className="flex items-center gap-2 flex-grow">
                    <span className="text-sm text-slate-600 whitespace-nowrap">Other:</span>
                  <input 
                    name="otherEthnicity"
                    type="text" 
                    placeholder="Please specify" 
                    className="bg-transparent border-b border-slate-300 outline-none text-sm text-slate-600 w-full focus:border-blue-400"
                    onClick={(e) => e.stopPropagation()}
                  />
                  </div>
                </label>

          {/* Submit button */}
          <div className="pt-4 flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-72 bg-blue-600 text-white font-semibold rounded-lg px-6 py-4 md:py-3 hover:bg-blue-700 transition-all shadow-md"
            >
              {loading ? "Saving..." : "Save Check-In"}
            </button>
          </div>
        </form>
      </div>
    </main>

    <Footer />
  </>
);
}