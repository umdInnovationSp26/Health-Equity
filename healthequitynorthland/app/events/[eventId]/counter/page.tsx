"use client";
import React, { useEffect, useState, use } from 'react';
import CounterCard from '@/app/components/countercard';
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import { Plus } from 'lucide-react';
import { FaArrowLeft } from "react-icons/fa";
import { useRouter } from "next/navigation";

import { db } from "@/app/lib/firebaseClient";
import { 
  doc,  
  collection, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  updateDoc,
} from "firebase/firestore";
import { mapDocToEvent } from "@/app/lib/eventInterface";
import Button from "@/app/components/button";

interface CounterData {
  id: string;
  name: string;
  value: number;
  initialValue: number;
  increment: number;
}

export default function CountersPage({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const { eventId } = use(params);

  const [eventData, setEventData] = useState<any>(null);
  const [counters, setCounters] = useState<CounterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCounter, setEditingCounter] = useState<CounterData | null>(null);
  const [tempName, setTempName] = useState("");

  // Listener for attendance counter
  useEffect(() => {
    const eventRef = doc(db, "event", eventId);
    const unsubEvent = onSnapshot(
      eventRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setEventData(mapDocToEvent(eventId, docSnap.data()));
        }
      },
      (error) => console.error("Event listener failed:", error),
    );

    // Listener for counters collection
    const countersRef = collection(db, "event", eventId, "counters");
    const q = query(countersRef);

    // setLoading(false) lives in these callbacks, so the error one keeps a
    // failed listener from parking the page on its spinner forever.
    const unsubCounters = onSnapshot(
      q,
      (snapshot) => {
        const fetchedCounters = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CounterData[];
        setCounters(fetchedCounters);
        setLoading(false);
      },
      (error) => {
        console.error("Counters listener failed:", error);
        setLoading(false);
      },
    );

    return () => {
      unsubEvent();
      unsubCounters();
    };
  }, [eventId]);

  // Handles global attendance updates
const updateGlobalAttendance = async (id: string, newVal: number) => {
  try {
    const eventRef = doc(db, "event", eventId);

    await updateDoc(eventRef, {
      attendees: newVal 
    });

    console.log(`Global attendance set to: ${newVal}`);
  } catch (e) {
    console.error("Error updating global attendance: ", e);
  }
};

  // Adds counter to Firebase
  const addCounter = async () => {
    if (!tempName) return;
    const newId = Date.now().toString();
    const newCounter: CounterData = {
      id: newId,
      name: tempName,
      value: 0,
      initialValue: 0,
      increment: 1
    };

    try {
      await setDoc(doc(db, "event", eventId, "counters", newId), newCounter);
      setTempName("");
      setIsAddModalOpen(false);
    } catch (e) {
      console.error("Error adding counter: ", e);
    }
  };

  // Updates custom counter in Firebase
  const updateFirebaseCounter = async (id: string, val: number) => {
    try {
      const counterToUpdate = counters.find(c => c.id === id);
      if (counterToUpdate) {
        await setDoc(doc(db, "event", eventId, "counters", id), {
          ...counterToUpdate,
          value: val
        });
      }
    } catch (e) {
      console.error("Error updating counter: ", e);
    }
  };

  // Saves name changes
  const saveEditedCounter = async (updated: CounterData) => {
    try {
      if (updated.id === 'main-attendance') {
        const eventRef = doc(db, "event", eventId);
        await updateDoc(eventRef, {
          attendees: updated.value,
          initialValue: updated.initialValue,
          increment: updated.increment
        });
      } else {
      await setDoc(doc(db, "event", eventId, "counters", updated.id), updated);
      }
      setEditingCounter(null);
    } catch (e) {
      console.error("Error saving counter: ", e);
    }
  };

  // Deletes counter from Firebase
  const deleteCounter = async (id: string) => {
    try {
      await deleteDoc(doc(db, "event", eventId, "counters", id));
    } catch (e) {
      console.error("Error deleting counter: ", e);
    }
  };

  if (loading) return <div className="p-25 text-center">Loading...</div>;
  if (!eventData) return <div className="p-25 text-center">Event not found.</div>;

  return (
    <>
      <Head>
        <title>Counters | {eventData.title}</title>
      </Head>

      <Navbar />

      <main className="pt-28 min-h-screen bg-white">
        {/* Header Bar */}
        <div className="max-w-6xl mx-auto px-4 mb-10">
            <div className="bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-between p-3 md:p-4">
                <div className="flex-1">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                    >
                        <FaArrowLeft size={18} className="md:size-[20px]" />
                    </button>
                </div>

                <div className="flex-[2] text-center px-2">
                    <h1 className="text-base md:text-xl font-bold text-slate-800 truncate leading-tight">
                        {eventData.title} Data
                    </h1>
                </div>

                <div className="flex-1 flex justify-end">
                    <Button
                        variant="primary"
                        onClick={() => setIsAddModalOpen(true)}
                        className="min-w-[40px]"
                    >
                        <span className="hidden md:inline">Add Counter</span>
                        <Plus size={18} />
                    </Button>
                </div>
            </div>
        </div>

        {/* Counters Logic */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4 pb-20">
          {/* Attendance Counter */}
          <CounterCard
            id="main-attendance"
            name="Total Attendance"
            value={eventData.attendees || 0}
            initialValue={eventData.initialValue || 0}
            increment={eventData.increment || 1}
            onEdit={() => setEditingCounter({
              id: 'main-attendance',
              name: 'Total Attendance',
              value: eventData.attendees || 0,
              initialValue: eventData.initialValue || 0,
              increment: eventData.increment || 1
            })} 
            onDelete={() => {}} 
            onReset={(id) => updateGlobalAttendance(id, eventData.initialValue || 0)}
            onUpdateValue={(id, val) => updateGlobalAttendance(id, val)}
          />

          {/* Custom Counters */}
          {counters.map(counter => (
            <CounterCard
              key={counter.id}
              {...counter}
              onEdit={() => setEditingCounter(counter)}
              onDelete={(id) => deleteCounter(id)}
              onReset={(id) => updateFirebaseCounter(id, counter.initialValue)}
              onUpdateValue={(id, val) => updateFirebaseCounter(id, val)}
            />
          ))}
        </div>

        {/* Add Modal */}
        {isAddModalOpen && (
             <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl relative">
               <h2 className="text-2xl font-semibold text-slate-800 mb-6">Start new counter</h2>
               <input
                 autoFocus
                 type="text"
                 placeholder="What are you counting?"
                 className="text-black w-full bg-slate-100 border-none rounded-xl p-4 mb-8 text-lg outline-none"
                 value={tempName}
                 onChange={(e) => setTempName(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && addCounter()}
               />
               <div className="flex gap-4">
                 <Button variant="secondary" onClick={() => setIsAddModalOpen(false)} className="flex-1">Cancel</Button>
                 <Button variant="primary" onClick={addCounter} className="flex-1">Add</Button>
               </div>
             </div>
           </div>
        )}

        {/* Edit Modal */}
        {editingCounter && (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl relative">
        <button 
          onClick={() => setEditingCounter(null)}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
        >
          <Plus className="rotate-45" size={24} />
        </button>

        <h2 className="text-2xl font-semibold text-slate-800 mb-8">Edit Counter</h2>
        
        <div className="space-y-4">
          {/* Counter Name (Disabled for attendance counter) */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Counter Name</label>
            <input
              type="text"
              className="text-black w-full bg-slate-100 rounded-xl p-3 outline-none disabled:opacity-50"
              value={editingCounter.name}
              disabled={editingCounter.id === 'main-attendance'}
              onChange={(e) => setEditingCounter({ ...editingCounter, name: e.target.value })}
            />
          </div>

          {/* Current Value */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Current Value</label>
            <input
              type="number"
              className="text-black w-full bg-slate-100 rounded-xl p-3 outline-none"
              value={editingCounter.value}
              onChange={(e) => setEditingCounter({ ...editingCounter, value: Number(e.target.value) })}
            />
          </div>

          {/* Initial Value */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Initial Value</label>
            <input
              type="number"
              className="text-black w-full bg-slate-100 rounded-xl p-3 outline-none"
              value={editingCounter.initialValue}
              onChange={(e) => setEditingCounter({ ...editingCounter, initialValue: Number(e.target.value) })}
            />
          </div>

          {/* Increment Value */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Increment/Decrement Value</label>
            <input
              type="number"
              className="text-black w-full bg-slate-100 rounded-xl p-3 outline-none"
              value={editingCounter.increment}
              onChange={(e) => setEditingCounter({ ...editingCounter, increment: Number(e.target.value) })}
            />
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => saveEditedCounter(editingCounter)}
          className="w-full mt-8"
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}