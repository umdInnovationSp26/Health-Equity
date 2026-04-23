"use client";
import React, { useEffect, useState, use } from 'react';
import CounterCard from '@/app/components/countercard';
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import { Plus, X } from 'lucide-react';
import { FaArrowLeft } from "react-icons/fa";
import { useRouter } from "next/navigation";

import { db } from "@/app/lib/firebaseClient";
import { 
  doc, 
  getDoc, 
  collection, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query 
} from "firebase/firestore";
import { mapDocToEvent } from "@/app/lib/eventInterface";

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

  const [event, setEventData] = useState<any>(null);
  const [counters, setCounters] = useState<CounterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCounter, setEditingCounter] = useState<CounterData | null>(null);
  const [tempName, setTempName] = useState("");

  // Fetch event details
  useEffect(() => {
    async function fetchEvent() {
      const docRef = doc(db, "event", eventId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEventData(mapDocToEvent(eventId, docSnap.data()));
      }
    }

    fetchEvent();

    // Listener for counters collection
    const countersRef = collection(db, "event", eventId, "counters");
    const q = query(countersRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCounters = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CounterData[];
      setCounters(fetchedCounters);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [eventId]);

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

  // Updates counter in Firebase
  const updateFirebaseCounter = async (updated: CounterData) => {
    try {
      await setDoc(doc(db, "event", eventId, "counters", updated.id), updated);
      setEditingCounter(null);
    } catch (e) {
      console.error("Error updating counter: ", e);
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
  if (!event) return <div className="p-25 text-center">Event not found.</div>;

  return (
    <>
      <Head>
        <title>Counters | {event.title}</title>
      </Head>

      <Navbar />

      <main className="pt-28 min-h-screen bg-white">
        {/* Header Bar */}
        <div className="max-w-6xl mx-auto px-4 mb-10">
            <div className="bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-between p-4 relative">
                <div className="flex-1 flex justify-start">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                    >
                        <FaArrowLeft size={20} />
                    </button>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2">
                    <h1 className="text-xl font-bold text-slate-800 whitespace-nowrap">
                        {event.title} Data
                    </h1>
                </div>

                <div className="flex-1 flex justify-end">
                    {counters.length > 0 && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md active:scale-95"
                        >
                            Add Counter <Plus size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* Counters Logic */}
        {counters.length === 0 ? (
          <div className="flex justify-center mt-20">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-50 w-full max-w-xl aspect-video rounded-3xl flex flex-col items-center justify-center gap-6 hover:bg-blue-100 transition-colors border-2 border-dashed border-blue-200"
            >
              <p className="text-3xl text-slate-600 font-medium">Tap to add counter</p>
              <div className="bg-slate-700 text-white p-6 rounded-2xl shadow-xl">
                <Plus size={64} />
              </div>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4 pb-20">
            {counters.map(counter => (
              <CounterCard
                key={counter.id}
                {...counter}
                onEdit={() => setEditingCounter(counter)}
                onDelete={(id) => deleteCounter(id)}
                onReset={(id) => updateFirebaseCounter({ ...counter, value: counter.initialValue })}
                onUpdateValue={(id, val) => updateFirebaseCounter({ ...counter, value: val })}
              />
            ))}
          </div>
        )}
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
                 <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-slate-200 rounded-xl">Cancel</button>
                 <button onClick={addCounter} className="flex-1 py-3 bg-blue-100 text-blue-600 rounded-xl">Add</button>
               </div>
             </div>
           </div>
        )}
        {editingCounter && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl relative">
              <h2 className="text-2xl font-semibold text-slate-800 mb-8 text-black">Edit Counter</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Counter Name</label>
                  <input
                    type="text"
                    className="text-black w-full bg-slate-100 rounded-xl p-4 outline-none"
                    value={editingCounter.name}
                    onChange={(e) => setEditingCounter({ ...editingCounter, name: e.target.value })}
                  />
                </div>
              </div>
              <button
                onClick={() => updateFirebaseCounter(editingCounter)}
                className="w-full mt-10 py-4 bg-blue-600 text-white font-semibold rounded-xl"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}