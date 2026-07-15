"use client";

import { useState } from "react";
import { FaArrowLeft, FaArrowRight, FaTimes } from "react-icons/fa";
import type { ProduceStat } from "../lib/actions";
import "@/public/globals.css";


interface OverlayProps {
  item: ProduceStat;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onConfirm: (lbs: number) => void;
  onClose: () => void;
}





const CountOverlay = ({
  item,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  onConfirm,
  onClose,
}: OverlayProps) => {
  const [displayValue, setDisplayValue] = useState(() => String(item.lbs ?? 0));

  const normalizePounds = (value: number) => Math.round(value * 100) / 100;

  const evaluateExpression = (expression: string) => {
    const trimmedExpression = expression.trim();
    if (!trimmedExpression) {
      return 0;
    }

    const sanitizedExpression = trimmedExpression.replace(/[^0-9.+\-*/()\skgglboz]/gi, "");
    if (!sanitizedExpression) {
      return 0;
    }

    const unitFactors: Record<string, number> = {
      kg: 2.20462262185,
      g: 0.00220462262185,
      lb: 1,
      oz: 1 / 16,
    };

    const convertedExpression = sanitizedExpression
      .replace(/\s+/g, "")
      .replace(/(\d+(?:\.\d+)?)(kg|g|lb|oz)/gi, (_match, value, unit) => {
        const normalizedUnit = unit.toLowerCase();
        const factor = unitFactors[normalizedUnit] ?? 1;
        return String(Number(value) * factor);
      });

    try {
      // eslint-disable-next-line no-new-func
      const calculatedValue = new Function(`"use strict"; return (${convertedExpression});`)();
      return Number.isFinite(calculatedValue) ? normalizePounds(calculatedValue) : 0;
    } catch {
      return 0;
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedValue = evaluateExpression(displayValue);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return;
    }

    onConfirm(parsedValue);
  };

  const handleClick = (value: string) => {
    if (value === '=') {
      const evaluatedValue = evaluateExpression(displayValue);
      setDisplayValue(String(evaluatedValue));
      return;
    }

    if (value === 'C') {
      setDisplayValue('');
      return;
    }

    if (value === 'CE') {
      setDisplayValue((current) => current.slice(0, -1));
      return;
    }

    if (value === 'ENT') {
      const parsedValue = evaluateExpression(displayValue);
      if (Number.isFinite(parsedValue) && parsedValue >= 0) {
        onConfirm(parsedValue);
      }
      return;
    }

    setDisplayValue((current) => {
      if (current === '0' && value !== '.') {
        return value;
      }

      return `${current}${value}`;
    });
  };
  return (
    <div className="count-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{item.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close count overlay"
          >
            <FaTimes />
          </button>
        </div>

        {/* Input */}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            <input
              type="text"
              inputMode="decimal"
              value={displayValue}
              readOnly
              onChange={(event) => setDisplayValue(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none ring-0 focus:border-slate-500"
            />
          </label>


          {/* Arrows */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
              >
                <FaArrowLeft /> Prev
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
              >
                Next <FaArrowRight />
              </button>
            </div>

    
          </div>
        </form>
    

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="overlay-calculator">


            <div className="overlay-calculator-grid">

              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('kg')}>kg</button>
              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('g')}>g</button>
              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('lb')}>lb</button>
              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('oz')}>oz</button>


              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('7')}>7</button>
              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('8')}>8</button>
              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('9')}>9</button>
              <button type="button" className="overlay-calculator-button operator" onClick={() => handleClick('CE')}>⌫</button>

              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('4')}>4</button>
              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('5')}>5</button>
              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('6')}>6</button>
              <button type="button" className="overlay-calculator-button operator" onClick={() => handleClick('+')}>+</button>

              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('1')}>1</button>
              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('2')}>2</button>
              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('3')}>3</button>
              <button type="button" className="overlay-calculator-button operator" onClick={() => handleClick('-')}>-</button>

              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('0') }>0</button>
              <button type="button" className="overlay-calculator-button" onClick={() => handleClick('.')}>.</button>
              <button type="button" className="overlay-calculator-button operator" onClick={() => handleClick('C')}>C</button>
              <button type="button" className="overlay-calculator-button operator" onClick={() => handleClick('ENT')}>ENT</button>
            </div>
          </div>
        </div>



      </div>
    </div>
  );
};

export default CountOverlay;

