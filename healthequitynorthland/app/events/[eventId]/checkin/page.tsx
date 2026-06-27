"use client";
import React, { useEffect, useState, use } from 'react';
import Head from "next/head";
import { FaArrowLeft } from "react-icons/fa";
import { db } from "@/app/lib/firebaseClient";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, increment, serverTimestamp, writeBatch } from "firebase/firestore";
import { CheckInFieldOptions } from "@/app/lib/check-in-fields";

export default function CheckInForm({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const { eventId } = use(params);
  
  const [eventData, setEventData] = useState<any>(null);
  const [enabledFields, setEnabledFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [partySize, setPartySize] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      if (!eventId) return;
      const docRef = doc(db, "event", eventId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEventData(data);
        if (Array.isArray(data.checkInFields)) {
          setEnabledFields(data.checkInFields);
        }
      }
    }
    fetchEvent();
  }, [eventId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventId) return alert("Event ID missing from URL");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") as string | null)?.trim() ?? "";
    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const phoneNumber = (formData.get("phoneNumber") as string | null)?.trim() ?? "";
    const age = formData.get("age") ? Number(formData.get("age")) : null;
    const zipCode = (formData.get("zipCode") as string | null)?.trim() ?? "";
    const other = (formData.get("other") as string | null)?.trim() ?? "";
    const raceEthnicity = formData.getAll("raceEthnicity");
    const safePartySize = Math.max(1, Number(partySize) || 1);
    const hispanicLatino = formData.get("hispanicLatino") as string | null;
    const checkInData = {
      name: name || null,
      email: email || null,
      phoneNumber: phoneNumber || null,
      age: age,
      zipCode: zipCode || null,
      other: other || null,
      hispanicLatino: hispanicLatino || null,
      raceEthnicity: raceEthnicity.length > 0 ? raceEthnicity : null,
      familySize: safePartySize,
      submittedAt: serverTimestamp(),
    };

    const contactData = {
      name: name || null,
      email: email || null,
      lastActivity: serverTimestamp(),
    };

    try {
      const batch = writeBatch(db);

      const checkInRef = doc(collection(db, "event", eventId, "checkin"));
      batch.set(checkInRef, checkInData);

      const contactDocId = email ? email.toLowerCase() : `guest-${eventId}-${Date.now()}`;
      const contactRef = doc(db, "contacts", contactDocId);
      batch.set(contactRef, contactData, { merge: true });

      const eventRef = doc(db, "event", eventId);
      batch.update(eventRef, {
        attendees: increment(safePartySize),
      });

      await batch.commit();
      setSubmitted(true);
      setFormKey((prev) => prev + 1);
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
        {submitted ? (
        <div className="flex justify-center">
            <form
            className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-12 space-y-6 md:space-y-8"
          >
            <h2 className="text-xl md:text-2xl font-bold text-center text-slate-800">{eventData?.title || "Loading Event..."} Check-In Form</h2>

            {/* HEN Logo */}
            <div className="flex justify-center">
              <img src="/HENsignin.png" alt="HEN Logo" className="h-16 w-auto"
              style = {{ maxWidth: '100%', height: 'auto' }} />
            </div>

          {/* Check in confirmation + option to check in another guest */}
          <section className="w-full max-w-2xl rounded-2xl border border-green-200 bg-green-50 p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-green-800">You’re checked in!</h2>
            <p className="mt-3 text-green-700">Thanks for checking in. You can close this page now.</p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-6 rounded-lg bg-green-600 px-5 py-3 text-white font-semibold hover:bg-green-700"
            >
              Check in another guest
            </button>
            
          </section>

          <center>
              Learn more about us at{" "}
              <a href="https://www.healthequitynorthland.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                https://www.healthequitynorthland.org/
              </a>
            </center>
            </form>
            </div>
            


          
        ) : (
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

          <center style={{ color: 'DodgerBlue', fontWeight: 'bold', fontSize: '2.5rem' }}> Welcome! </center>
          <center style={{fontSize: '1.5rem'}}> Please fill out the fields below.</center>

          {/* REQUIRED: party/family size */}
          <div className="flex flex-col items-center gap-4 text-center">
            <label htmlFor="familySize" className="text-sm font-semibold text-slate-700">
              <strong>How many people are in your party?</strong>
            </label>

            <div className="inline-flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm">

              {/* decrease button */}
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
                className="w-14 border-none bg-transparent text-center text-lg font-semibold text-slate-800 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"/>

              {/* increase button */}
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

          {/* Optional Fields */}
          {CheckInFieldOptions.filter((field) => enabledFields.includes(field.key)).map((field) => {
            const fieldLabel =
              field.key === "other"
                ? eventData?.otherFieldLabel || "Other"
                : field.label;


            if (field.key == "raceEthnicity") {
              return (
                  <div key={field.key} className="space-y-2">

                    {/* Using https://nces.ed.gov/ipeds/report-your-data/race-ethnicity-collecting-data-for-reporting-purposes
                    as a sort of guide for how to go about race/ethnicity data collection */}
                
                  <fieldset>
                    <strong>Are you Hispanic or Latino?</strong><br></br>
                    <input type ="radio" name="hispanicLatino" value="yes" />
                    <label htmlFor="yes">Yes</label><br></br>
    
                    <input type ="radio" name="hispanicLatino" value="no" />
                    <label htmlFor="no">No</label><br></br>

                    <input type ="radio" name="hispanicPreferNotToSay" value="preferNotToSay" />
                    <label htmlFor="preferNotToSay">Prefer not to say</label><br></br>

                  </fieldset>
                  <br /> 
                <p><strong>How do you identify yourself? (Select all that apply)</strong></p>
                <p>*If checking in for a group, select all that apply to your party.</p>
                
                  {/* Check-boxes for race/ethnicity */}
                  <input type="checkbox" id="americanIndian" name="raceEthnicity" value="American Indian or Alaska Native" />
                  <label htmlFor="americanIndian">American Indian or Alaska Native</label><br></br>
                  <input type="checkbox" id="asian" name="raceEthnicity" value="Asian" />
                  <label htmlFor="asian">Asian</label><br></br>
                  <input type="checkbox" id="black" name="raceEthnicity" value="Black or African American" /> 
                  <label htmlFor="black">Black or African American</label><br></br>
                  <input type="checkbox" id="nativeHawaiian" name="raceEthnicity" value="Native Hawaiian or Other Pacific Islander" />
                  <label htmlFor="nativeHawaiian">Native Hawaiian or Other Pacific Islander</label><br></br>
                  <input type="checkbox" id="white" name="raceEthnicity" value="White" />
                  <label htmlFor="white">White</label><br></br>
                  <input type="checkbox" id="other" name="raceEthnicity" value="Other" />
                  <label htmlFor="other">Other</label><br></br>
                  <input type="checkbox" id="preferNotToSay" name="raceEthnicity" value="Prefer not to say" />
                  <label htmlFor="preferNotToSay">Prefer not to say</label><br></br>

                </div>
                  );
            } 
        

          const inputType =
              field.key === "email"
                ? "email"
              : field.key === "age"
                ? "number"
              : field.key === "other"
                ? "text"
              : field.key === "phoneNumber"
                ? "tel"
                : "text";
              

            return (

                
              <div key={field.key} className="space-y-2">
                <label htmlFor={field.key} className="text-sm font-semibold text-slate-800">
                  <strong>{fieldLabel}</strong>
                </label>
                <input
                  id={field.key}
                  name={field.key}
                  type={inputType}
                  className="w-full p-3 bg-gray-100 rounded-lg outline-none"

                  placeholder={field.key == "other"? "":
                              field.key =="age"? "E.g. 45":
                              field.key =="name"?"E.g. Joe Doe":
                              field.key=="email"?"joedoe@email.com":
                              field.key=="zipCode"?"E.g. 54321":
                              field.key=="phoneNumber"?"E.g. 6512213354":""
                              
                  }
                />
              </div>

            );
          })}

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

            <center>
              Learn more about us at{" "}
              <a href="https://www.healthequitynorthland.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                https://www.healthequitynorthland.org/
              </a>
            </center>
          </form>
        )}
      </div>
    </main>
  </>
);
}