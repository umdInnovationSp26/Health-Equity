"use client";
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import { FaArrowLeft, FaAngleDown } from "react-icons/fa";
import { useEffect, useState } from "react";
import { auth, db } from "@/app/lib/firebaseClient";
import {
  query,
  orderBy,
  onSnapshot,
  collection,
  addDoc,
  writeBatch,
  doc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { convertDateToTimestamp } from "@/app/lib/dateTimeUtil";

import * as eventTypeUtil from "@/app/lib/eventTypeUtil";
import {
  Produce,
  convertKilogramsToOunces,
  convertKilogramsToPounds,
  convertOuncesToKilograms,
  convertOuncesToPounds,
  convertPoundsToKilograms,
  convertPoundsToOunces,
  mapDocToProduceOption,
} from "@/app/lib/produceUtil";

import { CheckInFieldOptions, CheckInFieldKey } from "@/app/lib/check-in-fields";
import { CheckInTrackableOptions, CheckInTrackableKey } from "@/app/lib/check-in-trackable-data";
import Button from "@/app/components/button";
import TimeSelect from "@/app/components/timeSelect";

//QRcode generation imports

const customCheckInTypeOptions = ["text", "number", "yes/no", "dropdown"];

const KG = "kg";
const LB = "lb";
const OZ = "oz";




export default function CreateEvent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false); // variable for waiting for db to save data
  const [createCheckInLink, setCreateCheckInLink] = useState(true);
  const [customCheckInFields, setCustomCheckInFields] = useState<Array<{label: string; type: string}>>([
    { label: "", type: "text" },
  ]);
  const [customTrackableFields, setCustomTrackableFields] = useState<string[]>([""]);

  const addCustomCheckInField = () =>
    setCustomCheckInFields((prev) => [...prev, { label: "", type: "text" }]);
  const updateCustomCheckInField = (index: number, value: string) =>
    setCustomCheckInFields((prev) =>
      prev.map((field, i) => (i === index ? { ...field, label: value } : field)),
    );
  const updateCustomCheckInFieldType = (index: number, value: string) =>
    setCustomCheckInFields((prev) =>
      prev.map((field, i) => (i === index ? { ...field, type: value } : field)),
    );
 
  const removeCustomCheckInField = (index: number) =>
    setCustomCheckInFields((prev) => prev.filter((_, i) => i !== index));

  const addCustomTrackableField = () =>
    setCustomTrackableFields((prev) => [...prev, ""]);
  const updateCustomTrackableField = (index: number, value: string) =>
    setCustomTrackableFields((prev) => prev.map((v, i) => (i === index ? value : v)));
  const removeCustomTrackableField = (index: number) =>
    setCustomTrackableFields((prev) => prev.filter((_, i) => i !== index));

  const eventTypeList = eventTypeUtil.getEventTypeSelect(); // list of types in int, string format to make html select options easier to create

  const [selectedType, setSelectedType] = useState<number | null>(null); // var to control which type of event is selected

  const [produceOptions, setProduceOptions] = useState<Produce[]>([]); // preset options to select from

  const [produceRows, setProduceRows] = useState<Produce[]>([]); // list of produce for this event

  const [producePerPerson, setProducePerPerson] = useState(""); // lbs of produce handed out per person

  // State to track what fields are enabled
  const [checkInFields, setCheckInFields] = useState<Record<CheckInFieldKey, boolean>>(
    () =>
      CheckInFieldOptions.reduce(
        (acc, field) => ({ ...acc, [field.key]: field.defaultChecked }),
        {} as Record<CheckInFieldKey, boolean>,
      ),
  );

  const toggleCheckInField = (key: CheckInFieldKey) => {
    setCheckInFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [checkInTrackableFields, setCheckInTrackableFields] = useState<Record<CheckInTrackableKey, boolean>>(
    () =>
      CheckInTrackableOptions.reduce(
        (acc, field) => ({ ...acc, [field.key]: field.defaultChecked }),
        {} as Record<CheckInTrackableKey, boolean>,
      ),
  );

  const toggleCheckInTrackableField = (key: CheckInTrackableKey) => {
    setCheckInTrackableFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Run this on page load
  useEffect(() => {
    // order alphabetically by name
    const q = query(collection(db, "produce"), orderBy("name", "desc"));

    // Grab data from the db
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) =>
          mapDocToProduceOption(doc.data()),
        );

        setProduceOptions(data); // update the options list
      },
      // Without this, a failed listener leaves the produce dropdown silently
      // empty and looks like "there is no produce configured".
      (error) => console.error("Produce options listener failed:", error),
    );

    return () => unsubscribe();
  }, []);

  // Add a new row
  const addRow = () => {
    setProduceRows([...produceRows, { name: "", amount: 0, units: "lb" }]);
  };

  const updateRow = (
    index: number,
    field: keyof Produce,
    value: string | number,
  ) => {
    const newRows = [...produceRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setProduceRows(newRows);
  };

  // Remove a specific row
  const removeRow = (id: number) => {
    setProduceRows(produceRows.filter((_, i) => i !== id));
  };


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
    const shouldCreateCheckInLink = createCheckInLink;

    // "Other" fields are only relevant when their checkbox is enabled
    const includeCheckInOther = shouldCreateCheckInLink && checkInFields.other;
    const includeTrackableOther = shouldCreateCheckInLink && checkInTrackableFields.other;

    const customCheckInFieldConfigs = customCheckInFields
      .filter((field) => field.label.trim().length > 0);
    const customCheckInFieldLabels = customCheckInFieldConfigs.map((field) => field.label.trim());
    const customCheckInFieldTypes = customCheckInFieldConfigs.map((field) => field.type);
    const customTrackableFieldLabels = customTrackableFields
      .map((label) => label.trim())
      .filter(Boolean);

    try {


      
      // create date objects from the string data
      const combinedStartDateTime = new Date(`${date}T${startTime}`);
      const combinedEndDateTime = new Date(`${date}T${endTime}`);

      const batch = writeBatch(db);

      // create the event beforhand so we have the eventId
      const eventRef = doc(collection(db, "event"));
      const newEventId = eventRef.id;
      const generatedCheckInLink =
        shouldCreateCheckInLink && typeof window !== "undefined"
          ? `${window.location.origin}/events/${newEventId}/checkin`
          : shouldCreateCheckInLink
            ? `/events/${newEventId}/checkin`
            : "";

      // event data
      batch.set(eventRef, {
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
        checkInLink: generatedCheckInLink,
        checkInFields: shouldCreateCheckInLink
          ? Object.keys(checkInFields).filter(
              (k) => checkInFields[k as CheckInFieldKey],
            )
          : [],
        trackableFields: shouldCreateCheckInLink
          ? Object.keys(checkInTrackableFields).filter(
              (k) => checkInTrackableFields[k as CheckInTrackableKey],
            )
          : [],
        customCheckInFields: includeCheckInOther ? customCheckInFieldLabels : [],
        customCheckInFieldTypes: includeCheckInOther ? customCheckInFieldTypes : [],
        customTrackableFields: includeTrackableOther ? customTrackableFieldLabels : [],
        producePerPersonLb: producePerPerson === "" ? null : Number(producePerPerson),
      });

      // add produce
      produceRows.forEach((row) => {
        if (!row.name || row.amount == 0) return; // Don't save rows without a selected product or whose count is 0

        // convert units on save
        // eslint-disable-next-line no-var
        var kgCount,
          lbCount,
          ozCount = 0;

        if (row.units == KG) {
          kgCount = row.amount;
          lbCount = convertKilogramsToPounds(row.amount);
          ozCount = convertKilogramsToOunces(row.amount);
        } else if (row.units == OZ) {
          kgCount = convertOuncesToKilograms(row.amount);
          lbCount = convertOuncesToPounds(row.amount);
          ozCount = row.amount;
        } else {
          // default to lb. No other option should be possible
          kgCount = convertPoundsToKilograms(row.amount);
          lbCount = row.amount;
          ozCount = convertPoundsToOunces(row.amount);
        }

        // Path: events -> [newEventId] -> produce -> [productName]
        const produceDocRef = doc(db, "event", newEventId, "produce", row.name);

        batch.set(produceDocRef, {
          kg: kgCount,
          lb: lbCount,
          oz: ozCount,
        });
      });

      
      // save to db
      await batch.commit();

      // Navigate to the new event's page
      router.push("/events/" + newEventId);
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

      <main className="pt-20 min-h-screen">
        {/* Top bar with search */}
        <div className="bg-white shadow-sm flex items-center justify-between p-4 gap-2 relative">
          <div className="content-start px-4">
            <button
              onClick={() => router.push("/events")}
              className="p-2 hover:scale-105 transition hover:cursor-pointer"
            >
              <FaArrowLeft />
            </button>
          </div>

          <h3 className="text-black absolute left-1/2 -translate-x-1/2 font-bold">
            Create Event
          </h3>

          <div className="content-end text-right pr-4">
            <button className="text-white rounded-sm px-3 sm:px-4 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base">
              ...
            </button>
          </div>
        </div>

        <div className="min-h-screen bg-gray-50 flex justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-gray-100 p-12 space-y-6"
          >
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

              {/* Date, time, and location fields */}
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

            {/* Check-in link section */}
            {/* Controls whether a check-in link / QR code is generated for this event. */}
            {/* Enabled by default for all events. */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="createCheckInLink"
                  checked={createCheckInLink}
                  onChange={(e) => setCreateCheckInLink(e.target.checked)}
                  className="form-checkbox mt-0.5 h-5 w-5 shrink-0 text-indigo-600 rounded"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-700">
                    Generate Check-In Link
                  </span>
                  <span className="block text-xs text-slate-500">
                    Create a shareable link and QR code so attendees can check
                    in. These settings cannot be changed after the event is created.  
                  </span>
                </span>
              </label>

              {/* If the check-in link option is enabled, show options for what fields to include on the check-in form */}
              {createCheckInLink && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Fields to collect at check-in
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                    {CheckInFieldOptions.map((field) => (
                      <div key={field.key} className={`space-y-2 ${ field.key === "other" && checkInFields[field.key] ? "col-span-full" : ""}`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!checkInFields[field.key]}
                            onChange={() => toggleCheckInField(field.key)}
                            className="form-checkbox h-4 w-4 shrink-0 text-indigo-600 rounded"
                          />
                          <span className="text-sm text-slate-600 capitalize">
                            {field.label}
                          </span>
                        </label>


                {/* If the "other" option is checked, let the user add one or more custom fields */}
                        {field.key === "other" && checkInFields[field.key] && (
                          <div className="space-y-2 space-x-1">
                            {customCheckInFields.map((field, i) => (
                              <div key={i} className="flex items-center gap-2">

                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => updateCustomCheckInField(i, e.target.value)}
                                  placeholder="Name this field (e.g. Preferred Language)"
                                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-400"
                                />

                                <select
                                  value={field.type}
                                  onChange={(e) => updateCustomCheckInFieldType(i, e.target.value)}
                                  className="rounded-lg border border-slate-300 bg-white p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-400"
                                >
                                  {customCheckInTypeOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option === "yes/no" ? "Yes/No" : option === "dropdown" ? "Dropdown" : option.charAt(0).toUpperCase() + option.slice(1)}
                                    </option>
                                  ))}
                                </select>

                                {customCheckInFields.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeCustomCheckInField(i)}
                                    aria-label="Remove field"
                                    className="shrink-0 text-lg leading-none text-red-500 hover:text-red-600"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={addCustomCheckInField}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                              + Add another field
                            </button>
                          </div>
                  )}
                      </div>
                    ))}
                  </div>


                {/* Track #bags of health products distributed, #Information brochures distributed, Total poundage of produce distributed, and anything else */}
                  <div className="space-y-3 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Information to Track at Check-In (Attendance is automatically tracked)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                    {CheckInTrackableOptions.map((field) => (
                      <div key={field.key} className={`space-y-2 ${ field.key === "other" && checkInTrackableFields[field.key] ? "col-span-full" : ""}`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!checkInTrackableFields[field.key]}
                            onChange={() => toggleCheckInTrackableField(field.key)}
                            className="form-checkbox h-4 w-4 shrink-0 text-blue-600 rounded"
                          />
                          <span className="text-sm text-slate-600 capitalize">
                            {field.label}
                          </span>
                        </label>

                {/* If the "other" option is checked, let the user add one or more custom items */}
                       {field.key === "other" && checkInTrackableFields[field.key] && (
                          <div className="space-y-2">
                            {customTrackableFields.map((value, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => updateCustomTrackableField(i, e.target.value)}
                                  placeholder="Name this item (e.g. Water Bottles)"
                                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-400"
                                />
                                {customTrackableFields.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeCustomTrackableField(i)}
                                    aria-label="Remove item"
                                    className="shrink-0 text-lg leading-none text-red-500 hover:text-red-600"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={addCustomTrackableField}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                              + Add another item
                            </button>
                          </div>
                  )}

                      </div>
                    ))}
                  </div>
                </div>
            </div>
              )
              
            }
            </div>


            {/* Location, start time, end time, and description fields */}

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
                <TimeSelect name="startTime" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  End Time
                </label>
                <TimeSelect name="endTime" required />
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


            {/* Event type selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Event Type
              </label>
              <select
                name="eventType"
                required
                className="w-full p-3 bg-gray-100 rounded-lg outline-none focus:ring-1 focus:ring-indigo-400"
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

            <div className="max-w-4xl bg-white">
              <label className="text-sm font-semibold text-slate-700 mb-4">
                Produce
              </label>

              <div className="space-y-3">
                {produceRows.map((row, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className=" flex-shrink-0"
                    >
                      <div
                        className="hover:cursor-pointer w-6 h-6 rounded-full bg-white text-red-500 border border-red-400
                        flex items-center justify-center transition-colors
                        hover:bg-red-600 hover:text-white"
                      >
                        <span className="text-lg font-bold">-</span>
                      </div>
                    </button>

                    {/* produce Select */}
                    <div className="flex-grow relative">
                      <select
                        value={row.name}
                        onChange={(e) =>
                          updateRow(index, "name", e.target.value)
                        }
                        className="w-full bg-gray-100 border-none rounded-lg p-3 text-slate-600 appearance-none cursor-pointer focus:ring-1 focus:ring-indigo-400"
                      >
                        <option value="">Select Produce</option>
                        {Array.from(produceOptions).map((produce) => (
                          <option key={produce.name} value={produce.name}>
                            {" "}
                            {produce.name}{" "}
                          </option>
                        ))}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                        <FaAngleDown />
                      </span>
                    </div>

                    {/* Quantity Select */}
                    <div className="w-24">
                      <input
                        type="number"
                        min="0"
                        step="any" // Allows any decimal precision
                        placeholder="0.00"
                        value={row.amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Basic check to ensure it's not negative
                          if (Number(val) >= 0 || val === "") {
                            updateRow(
                              index,
                              "amount",
                              val === "" ? "" : Number(val),
                            );
                          }
                        }}
                        className="w-full bg-gray-100 border-none rounded-lg p-3 text-slate-600 focus:ring-1 focus:ring-indigo-400 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Unit Select */}
                    <div className="relative w-20">
                      <select
                        value={row.units}
                        onChange={(e) =>
                          updateRow(index, "units", e.target.value)
                        }
                        className="w-full bg-gray-100 border-none rounded-lg p-3 text-slate-600 appearance-none cursor-pointer text-center focus:ring-1 focus:ring-indigo-400"
                      >
                        <option value={KG}>kg</option>
                        <option value={LB}>lb</option>
                        <option value={OZ}>oz</option>
                      </select>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                        <FaAngleDown />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addRow}
                className="mt-4 text-slate-400 text-sm hover:text-blue-500 transition-colors cursor-pointer"
              >
                + Add produce
              </button>

              {/* Amount of produce distributed to each person who takes produce */}
              <div className="mt-6 space-y-2">
                <label
                  htmlFor="producePerPerson"
                  className="text-sm font-semibold text-slate-700"
                >
                  Produce per person (lbs)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="producePerPerson"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={producePerPerson}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (Number(val) >= 0 || val === "") {
                        setProducePerPerson(val);
                      }
                    }}
                    className="w-32 bg-gray-100 border-none rounded-lg p-3 text-slate-600 focus:ring-1 focus:ring-indigo-400 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-sm text-slate-500">lbs per person</span>
                </div>
                <p className="text-xs text-slate-500">
                  How many pounds of produce each person receives.
                </p>
              </div>
            </div>

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
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full md:w-64"
              >
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
            
          </form>
        </div>

      </main>

      <Footer />
    </>
  );
}
