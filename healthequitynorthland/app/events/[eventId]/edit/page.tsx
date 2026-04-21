"use client";
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";

import { FaArrowLeft, FaAngleDown } from "react-icons/fa";

import { use, useEffect, useState } from "react";

import { auth, db } from "@/app/lib/firebaseClient";
import { query, orderBy, onSnapshot, collection, addDoc, writeBatch, doc, getDoc, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { convertDateToTimestamp, getDateInHTML, getTimeInHTML, getTimeOnlyString } from "@/app/lib/dateTimeUtil";

import * as eventTypeUtil from "@/app/lib/eventTypeUtil";
import { Produce, convertKilogramsToOunces, convertKilogramsToPounds, convertOuncesToKilograms, convertOuncesToPounds, convertPoundsToKilograms, convertPoundsToOunces, mapDocToEventProduce, mapDocToProduceOption } from "@/app/lib/produceUtil";
import { Event, mapDocToEvent } from "@/app/lib/eventInterface";


const KG = "kg"
const LB = "lb"
const OZ = "oz"


export default function CreateEvent({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
    const router = useRouter();


    const eventTypeList = eventTypeUtil.getEventTypeSelect(); // list of types in int, string format to make html select options easier to create

    const [selectedType, setSelectedType] = useState<number | null>(null); // var to control which type of event is selected

    const [produceOptions, setProduceOptions] = useState<Produce[]>([]); // preset options to select from 
    
    const [produceRows, setProduceRows] = useState<Produce[]>([]); // list of produce for this event

    
    // Unwrap the params to get the ID
    const { eventId } = use(params);

    const [event, setEventData] = useState<Event>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
    async function loadEventData() {
      try {
        // 1. Setup references
        const eventRef = doc(db, "event", eventId);
        const produceRef = collection(db, "event", eventId, "produce");
        const produceOptionsQuery = query(collection(db, "produce"), orderBy("name", "asc"));

        // 2. Fetch both at the same time
        const [eventSnap, produceSnap, optionsSnap] = await Promise.all([
          getDoc(eventRef),
          getDocs(produceRef),
          getDocs(produceOptionsQuery)
        ]);

        if (eventSnap.exists()) {
          setEventData(mapDocToEvent(eventId, eventSnap.data()));
          setSelectedType(event?.eventTypeId || -1);
        }

        // 3. Map the produce documents into your 'rows' state
        if (!produceSnap.empty) {
          const loadedRows = produceSnap.docs.map(doc => mapDocToEventProduce(doc.id, doc.data()));
          setProduceRows(loadedRows);

        }

        const options = optionsSnap.docs.map(doc => mapDocToProduceOption(doc.data()));
        setProduceOptions(options);

      } catch (error) {
        console.error("Error loading event:", error);
      } finally {
        setLoading(false);
      }
    }
    loadEventData();
  }, [eventId]);

  if (loading) return <div>Loading...</div>;


  // Add a new row
  const addRow = () => {
    setProduceRows([...produceRows, {name: "", amount: 0, units: "lb"}]);
  };

  const updateRow = (index: number, field: keyof Produce, value: string | number) => {
    const newRows = [...produceRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setProduceRows(newRows);
  };

  // Remove a specific row
  const removeRow = (id: number) => {
    setProduceRows(produceRows.filter((_, i) => i !== id));
  }


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

        const batch = writeBatch(db);

        // create the event beforhand so we have the eventId
        const eventRef = doc(db, "event", eventId); 

        // event data
        batch.update(eventRef, {
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

        // 3. Fetch current produce in DB to identify what needs to be deleted
        const produceColRef = collection(db, "event", eventId, "produce");
        const currentProduceSnap = await getDocs(produceColRef);
        
        // Get list of names currently in the UI
        const uiProduceNames = produceRows.map(r => r.name);

        // 4. Delete docs that are in DB but NO LONGER in the UI
        currentProduceSnap.docs.forEach((doc) => {
        if (!uiProduceNames.includes(doc.id)) {
            batch.delete(doc.ref);
        }
        });

        // add produce
        produceRows.forEach((row) => {
            if ((!row.name) || (row.amount == 0)) return; // Don't save rows without a selected product or whose count is 0


            // convert units on save
            // eslint-disable-next-line no-var
            var kgCount, lbCount, ozCount = 0;

            if(row.units == KG){
            kgCount = row.amount;
            lbCount = convertKilogramsToPounds(row.amount);
            ozCount = convertKilogramsToOunces(row.amount);
            }
            else if(row.units == OZ){
            kgCount = convertOuncesToKilograms(row.amount);
            lbCount = convertOuncesToPounds(row.amount);
            ozCount = row.amount;
            }
            else { // default to lb. No other option should be possible
            kgCount = convertPoundsToKilograms(row.amount);
            lbCount = row.amount;
            ozCount = convertPoundsToOunces(row.amount);
            }

            // Path: events -> [newEventId] -> produce -> [productName]
            const produceDocRef = doc(db, "event", eventId, "produce", row.name);
            
            batch.set(produceDocRef, {
                kg: kgCount,
                lb: lbCount,
                oz: ozCount
            });
        });

        // save to db
        await batch.commit();


        // Navigate to the new event's page
        router.push("/events/" + eventId);

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
              onClick={() => router.push("/events/" + eventId)}
              className="p-2 hover:scale-105 transition hover:cursor-pointer"
            >
              <FaArrowLeft />
            </button>
          </div>

          <h3 className="text-black absolute left-1/2 -translate-x-1/2 font-bold">
            Edit Event
          </h3>

          <div className="content-end text-right pr-4">
            <button className="text-white rounded-sm px-3 sm:px-4 py-2 hover:scale-105 transition text-sm sm:text-base">
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
                  defaultValue={event?.title}
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
                  defaultValue={getDateInHTML(event?.dateStart)}
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
                defaultValue={event?.location}
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
                  defaultValue={getTimeInHTML(event?.dateStart)}
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
                  defaultValue={getTimeInHTML(event?.dateEnd)}
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
                defaultValue={event?.description}
              />
            </div>


          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Event Type
            </label>
            <select
                name="eventType"
                required
                className="w-full p-3 bg-gray-100 rounded-lg outline-none focus:ring-1 focus:ring-indigo-400"
                defaultValue={event?.eventTypeId}
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
                defaultValue={event?.suppliesInformation}
              />
            </div>
          )}

          <div className="max-w-4xl bg-white">
            <label className="text-sm font-semibold text-slate-700 mb-4">Produce</label>
            
            <div className="space-y-3">
              {produceRows.map((row, index) => (
                <div key={index} className="flex flex-wrap items-center gap-3 pt-5 sm:pt-0">
                  
                  {/* Remove Button */}
                  <button type="button"
                    onClick={() => removeRow(index)}
                    className=" flex-shrink-0"
                  >
                    <div className="w-6 h-6 rounded-full bg-white text-red-500 border border-red-400
                        flex items-center justify-center transition-colors
                        hover:bg-red-600 hover:text-white">
                      <span className="text-lg font-bold">-</span>
                    </div>
                  </button>

                  {/* produce Select */}
                  <div className="flex-grow relative">
                    <select 
                      value={row.name}
                      onChange={(e) => updateRow(index, 'name', e.target.value)}
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
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]"><FaAngleDown /></span>
                  </div>

                  <div className="flex flex-grow sm:flex-grow-0 gap-2 min-w-[180px] justify-end sm:justify-normal">
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
                            updateRow(index, 'amount', val === "" ? "" : Number(val));
                            }
                        }}
                        className="w-full bg-gray-100 border-none rounded-lg p-3 text-slate-600 focus:ring-1 focus:ring-indigo-400 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>

                    {/* Unit Select */}
                    <div className="relative w-20">
                        <select 
                        value={row.units}
                        onChange={(e) => updateRow(index, 'units', e.target.value)}
                        className="w-full bg-gray-100 border-none rounded-lg p-3 text-slate-600 appearance-none cursor-pointer text-center focus:ring-1 focus:ring-indigo-400"
                        >
                        <option value={KG}>kg</option>
                        <option value={LB}>lb</option>
                        <option value={OZ}>oz</option>
                        </select>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]"><FaAngleDown /></span>
                    </div>
                    </div>
                  </div>
              ))}
            </div>

            <button type="button"
              onClick={addRow}
              className="mt-4 text-slate-400 text-sm hover:text-blue-500 transition-colors cursor-pointer"
            >
              + Add produce
            </button>
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
              defaultValue={event?.notes}
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
      </main>

      <Footer />
    </>
  );
}
