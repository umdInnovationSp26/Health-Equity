import React, { useState } from 'react';
import { MoreVertical, Plus, Minus, Pencil, RotateCcw, Trash2 } from 'lucide-react';

interface CounterProps {
  id: string;
  name: string;
  value: number;
  increment: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReset: (id: string) => void;
  onUpdateValue: (id: string, newValue: number) => void;
}

export default function CounterCard({ 
  id, name, value, increment, onEdit, onDelete, onReset, onUpdateValue 
}: CounterProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative bg-blue-50 rounded-3xl p-8 flex flex-col items-center w-full max-w-sm shadow-sm">
      {/* Header Menu */}
      <div className="absolute top-4 right-4">
        <button onClick={() => setShowMenu(!showMenu)} className="p-1 hover:bg-blue-100 rounded-full">
          <MoreVertical className="text-slate-600" size={24} />
        </button>
        
        {showMenu && (
          <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-10 py-1">
            <button onClick={() => { onEdit(id); setShowMenu(false); }} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Pencil size={14} className="mr-2" /> Edit
            </button>
            <button onClick={() => { onReset(id); setShowMenu(false); }} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <RotateCcw size={14} className="mr-2" /> Reset
            </button>
            <button onClick={() => { onDelete(id); setShowMenu(false); }} className="w-full flex items-center px-4 py-2 text-sm text-red-500 hover:bg-gray-50">
              <Trash2 size={14} className="mr-2" /> Delete
            </button>
          </div>
        )}
      </div>

      <h3 className="text-2xl font-semibold text-slate-700 mb-4">{name}</h3>
      <span className="text-8xl font-bold text-slate-800 mb-8">{value}</span>

      <div className="flex gap-6">
        <button 
          onClick={() => onUpdateValue(id, value - (increment || 1))}
          className="bg-slate-700 text-white p-6 rounded-2xl hover:bg-slate-800 transition-colors shadow-lg"
        >
          <Minus size={48} strokeWidth={3} />
        </button>
        <button 
          onClick={() => onUpdateValue(id, value + (increment || 1))}
          className="bg-slate-700 text-white p-6 rounded-2xl hover:bg-slate-800 transition-colors shadow-lg"
        >
          <Plus size={48} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}