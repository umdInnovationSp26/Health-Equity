"use client";
import React, { useEffect, useState, use } from 'react';
import Head from "next/head";
import { FaArrowLeft } from "react-icons/fa";
import { db } from "@/app/lib/firebaseClient";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, increment, serverTimestamp, writeBatch } from "firebase/firestore";
import { CheckInFieldOptions } from "@/app/lib/check-in-fields";
import { CheckInTrackableOptions } from "@/app/lib/check-in-trackable-data";
import CountOverlay from "@/app/produce/inventory/components/CountOverlay";
import { PhoneInput } from "@/app/components/phone-input";
import Button from "@/app/components/button";


export default function CheckInForm({ params }: { params: Promise<{ eventId: string }> }) {
    const [isChecked, setIsChecked] = useState(false);
  const router = useRouter();
  const { eventId } = use(params);
  const additionalValueRef = React.useRef<HTMLInputElement | null>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [enabledFields, setEnabledFields] = useState<string[]>([]);
  const [customCheckInLabels, setCustomCheckInLabels] = useState<string[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [enabledTrackables, setEnabledTrackables] = useState<string[]>([]);
  const [customTrackableLabels, setCustomTrackableLabels] = useState<string[]>([]);
  const [trackedItems, setTrackedItems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [partySize, setPartySize] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  // Trackable items the coordinator chose to collect at check-in.
  // Built-in options first, then any custom "Other" labels.
  const trackableItems: string[] = [
    ...CheckInTrackableOptions.filter(
      (option) => option.key !== "other" && enabledTrackables.includes(option.key),
    ).map((option) => option.label),
    ...(enabledTrackables.includes("other")
      ? customTrackableLabels.length > 0
        ? customTrackableLabels
        : ["Other Supplies"]
      : []),
  ];

  const toggleTrackedItem = (label: string) =>
    setTrackedItems((prev) => ({ ...prev, [label]: !prev[label] }));

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
        if (Array.isArray(data.customCheckInFields)) {
          setCustomCheckInLabels(data.customCheckInFields);
        }
        if (Array.isArray(data.trackableFields)) {
          setEnabledTrackables(data.trackableFields);
        }
        if (Array.isArray(data.customTrackableFields)) {
          setCustomTrackableLabels(data.customTrackableFields);
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
    const phoneNumberValue = phoneNumber.trim();
    const age = formData.get("age") ? Number(formData.get("age")) : null;
    const zipCode = (formData.get("zipCode") as string | null)?.trim() ?? "";
    // Values for the coordinator's custom "Other" fields, keyed by their label
    const customFieldLabels =
      customCheckInLabels.length > 0
        ? customCheckInLabels
        : [eventData?.otherFieldLabel || "Other"];
    const customFieldsData = enabledFields.includes("other")
      ? customFieldLabels.reduce(
          (acc, label) => {
            const value = (customFieldValues[label] ?? "").trim();
            if (value) acc[label] = value;
            return acc;
          },
          {} as Record<string, string>,
        )
      : {};
    const additionalRaceEthnicity = (formData.get("additionalRaceEthnicity") as string | null)?.trim() ?? "";
    const raceEthnicity = formData
      .getAll("raceEthnicity")
      .map((value) => (value === "Additional" ? additionalRaceEthnicity : value))
      .filter((value) => typeof value === "string" && value.trim().length > 0);
    const safePartySize = Math.max(1, Number(partySize) || 1);
    // Boolean map of which trackable items this attendee grabbed
    const trackedItemsData = trackableItems.reduce(
      (acc, label) => {
        acc[label] = !!trackedItems[label];
        return acc;
      },
      {} as Record<string, boolean>,
    );
    const checkInData = {
      name: name || null,
      email: email || null,
      phoneNumber: phoneNumberValue || null,
      age: age,
      zipCode: zipCode || null,
      customFields: Object.keys(customFieldsData).length > 0 ? customFieldsData : null,
      raceEthnicity: raceEthnicity.length > 0 ? raceEthnicity : null,
      familySize: safePartySize,
      trackedItems: trackableItems.length > 0 ? trackedItemsData : null,
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
      setPhoneNumber("");
      setTrackedItems({});
      setCustomFieldValues({});
      setPartySize(1);
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
            <Button
              variant="success"
              onClick={() => setSubmitted(false)}
              className="mt-6"
            >
              Check in another guest
            </Button>
            
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
    
                  <br /> 


                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6 space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
              <span>
                  <span className="block text-sm font-semibold text-slate-700">
                    Ethnicity/Ancestry/Heritage/National Origin 
                  </span>
                  <span className="block text-xs text-slate-500">
                    If checking in for a group, select all that apply to your party.
                  </span>
                </span>
                  </label>   

                  <div className="space-y-3 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Select All That Apply
                  </p>

                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="africanAmerican" name="raceEthnicity" value="African American" className="form-checkbox h-4 w-4 shrink-0 text-indigo-600 rounded"/>
                 <span className="text-sm text-slate-600 capitalize">
                      African American
                      </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="africanHeritage" name="raceEthnicity" value="African Heritage" className="form-checkbox h-4 w-4 shrink-0 text-indigo-600 rounded"/>
                    <span className="text-sm text-slate-600 capitalize">
                      African Heritage
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="asianAmerican" name="raceEthnicity" value="Asian American" className="form-checkbox h-4 w-4 shrink-0 text-indigo-600 rounded"/>
                    <span className="text-sm text-slate-600 capitalize">
                      Asian American/Asian
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="europeanAmerican" name="raceEthnicity" value="European American" className="form-checkbox h-4 w-4 shrink-0 text-indigo-600 rounded"/>
                    <span className="text-sm text-slate-600 capitalize">
                      EuroAmerican/EuroDescent
                    </span>
                  </label>
         
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="hispanicAmerican" name="raceEthnicity" value="Hispanic American" className="form-checkbox h-4 w-4 shrink-0 text-indigo-600 rounded"/>
                    <span className="text-sm text-slate-600 capitalize">
                      Hispanic American/Latinx
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="indigenousAmerican" name="raceEthnicity" value="Indigenous American" className="form-checkbox h-4 w-4 shrink-0 text-indigo-600 rounded"/>
                    <span className="text-sm text-slate-600 capitalize">
                      Native American/Indigenous
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">  
                    <input type="checkbox" checked={isChecked}
                        onChange={(e) => setIsChecked(e.target.checked)} id="additional" name="raceEthnicity" value="Additional" className="form-checkbox h-4 w-4 shrink-0 text-indigo-600 rounded" />
                         <span className="text-sm text-slate-600 capitalize">
                            Additional
                         </span>
                  </label>    
                      
                  {isChecked &&
                  <input type="text" 
                  name="additionalRaceEthnicity" 
                  placeholder="Please specify..."
                  className="ml-6 block w-[calc(100%-1.5rem)] rounded-lg border border-slate-300 bg-white text-sm p-2 outline-none focus:ring-1 focus:ring-indigo-400"/>
                  }
                  </div>

                  </div>
                </div>   
              );
            }
            if (field.key === "phoneNumber") {
              return (
                <div key={field.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6 space-y-3">
                  <label htmlFor={field.key} className="block text-sm font-semibold text-slate-700">
                    {fieldLabel}
                  </label>
                  <PhoneInput
                    id={field.key}
                    defaultCountry="US"
                    placeholder="Your phone number"
                    value={phoneNumber}
                    onChange={(value) => setPhoneNumber(value ?? "")}
                  />
                </div>
              );
            }

            // "Other" renders one labeled input per custom field the coordinator added.
            if (field.key === "other") {
              const labels =
                customCheckInLabels.length > 0
                  ? customCheckInLabels
                  : [eventData?.otherFieldLabel || "Other"];
              return (
                <div key={field.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6 space-y-4">
                  {labels.map((label, i) => (
                    <div key={`${label}-${i}`} className="space-y-2">
                      <label
                        htmlFor={`custom-${i}`}
                        className="block text-sm font-semibold text-slate-700"
                      >
                        {label}
                      </label>
                      <input
                        id={`custom-${i}`}
                        type="text"
                        value={customFieldValues[label] ?? ""}
                        onChange={(e) =>
                          setCustomFieldValues((prev) => ({ ...prev, [label]: e.target.value }))
                        }
                        placeholder={`Enter your response`}
                        className="block w-full rounded-lg border border-slate-300 bg-white text-sm p-3 outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                  ))}
                </div>
              );
            }

          const inputType =
              field.key === "email"
                ? "email"
              : field.key === "age"
                ? "number"
                : "text";
              

            return (

                
              <div key={field.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6 space-y-3">
                <label htmlFor={field.key} className="block text-sm font-semibold text-slate-700">
                  {fieldLabel}
                </label>
                <input
                  id={field.key}
                  name={field.key}
                  type={inputType}
                  className="block w-full rounded-lg border border-slate-300 bg-white text-sm p-3 outline-none focus:ring-1 focus:ring-indigo-400"

                  placeholder={field.key =="age"? "your age":
                              field.key =="name"?"Lorem Ipsum":
                              field.key=="email"?"joedoe@email.com":
                              field.key=="zipCode"?"your zipcode":""
                  }
                />
              </div>

            );
          })}

          {/* Trackable items — only shown if the coordinator chose to track them */}
          {trackableItems.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6 space-y-4">
              <span>
                <span className="block text-sm font-semibold text-slate-700">
                  Did you take any of the following?
                </span>
                <span className="block text-xs text-slate-500">
                  Check all that apply.
                </span>
              </span>

              <div className="space-y-3 border-t border-slate-200 pt-4">
                {trackableItems.map((label) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!trackedItems[label]}
                      onChange={() => toggleTrackedItem(label)}
                      className="form-checkbox h-4 w-4 shrink-0 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-slate-600 capitalize">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Submit button */}
          <div className="pt-4 flex justify-center">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full md:w-72"
            >
              {loading ? "Saving..." : "Check-In"}
            </Button>
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