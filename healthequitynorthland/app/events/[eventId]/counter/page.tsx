// app/counters/page.tsx
"use client";
import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import CounterCard from '@/app/components/countercard';
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";

import { FaArrowLeft} from "react-icons/fa";

interface CounterData {
  id: string;
  name: string;
  value: number;
  initialValue: number;
  increment: number;
}

import { useRouter } from "next/navigation";

export default function CountersPage() {
  const [counters, setCounters] = useState<CounterData[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCounter, setEditingCounter] = useState<CounterData | null>(null);
  
  // Form State
  const [tempName, setTempName] = useState("");

  const addCounter = () => {
    if (!tempName) return;
    const newCounter: CounterData = {
      id: Date.now().toString(),
      name: tempName,
      value: 0,
      initialValue: 0,
      increment: 1
    };
    setCounters([...counters, newCounter]);
    setTempName("");
    setIsAddModalOpen(false);
  };

  const updateCounter = (updated: CounterData) => {
    setCounters(counters.map(c => c.id === updated.id ? updated : c));
    setEditingCounter(null);
  };

  return (
 <>
 <Head>
         <title>HealthEquityNorthland</title>
         <meta name="description" content="HealthEquityNorthland" />
         <link rel="canonical" href="https://HealthEquityNorthland.org/" />
       </Head>
    
          <Navbar />
    

    <div className="min-h-screen bg-white pb-20">
      
      
      {/* Header */}
      <div className="flex justify-between items-center mb-12 max-w-6xl mx-auto">
        <div className="w-10 h-10" /> {/* Spacer for centering */}
        <h1 className="text-xl font-medium text-slate-800">Count Data</h1>
        {counters.length > 0 && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Add New Counter <Plus size={18} />
          </button>
        )}
      </div>

      {/* Empty State */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {counters.map(counter => (
            <CounterCard 
              key={counter.id}
              {...counter}
              onEdit={() => setEditingCounter(counter)}
              onDelete={(id) => setCounters(counters.filter(c => c.id !== id))}
              onReset={(id) => setCounters(counters.map(c => c.id === id ? {...c, value: c.initialValue} : c))}
              onUpdateValue={(id, val) => setCounters(counters.map(c => c.id === id ? {...c, value: val} : c))}
            />
          ))}
        </div>
      )}
      {/* Add counter modal */}
{isAddModalOpen && (
  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl relative">
      <h2 className="text-2xl font-semibold text-slate-800 mb-6">Start new counter</h2>
      
      <input 
        autoFocus
        type="text" 
        placeholder="What are you counting?"
        className="w-full bg-slate-100 border-none rounded-xl p-4 mb-8 text-lg focus:ring-2 focus:ring-blue-500 outline-none"
        value={tempName}
        onChange={(e) => setTempName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && addCounter()}
      />

      <div className="flex gap-4">
        <button 
          onClick={() => {
            setIsAddModalOpen(false);
            setTempName("");
          }}
          className="flex-1 py-3 px-6 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={addCounter}
          className="flex-1 py-3 px-6 bg-blue-100 text-blue-600 font-semibold rounded-xl hover:bg-blue-200 transition-colors"
        >
          Add New Counter
        </button>
      </div>
    </div>
  </div>
)}
    </div>
    <Footer />
    </>
  );
}