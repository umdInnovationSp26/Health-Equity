import * as React from "react";
import { FaAngleDown } from "react-icons/fa";

/** Format a 24-hour "HH:MM" value as a friendly 12-hour "h:MM AM/PM" label. */
function formatTimeLabel(value: string) {
  const [h, m] = value.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hours12 = h % 12 === 0 ? 12 : h % 12;
  return `${hours12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Build time options across a full day at a fixed minute interval.
 * value = 24-hour "HH:MM" (what forms/Date parsing expect),
 * label = friendly 12-hour "h:MM AM/PM".
 */
function buildTimeOptions(stepMinutes: number) {
  const options: { value: string; label: string }[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const hours24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const value = `${String(hours24).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    options.push({ value, label: formatTimeLabel(value) });
  }
  return options;
}

export interface TimeSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  /** Minutes between options (default 15). */
  stepMinutes?: number;
  /** Placeholder shown when nothing is selected. */
  placeholder?: string;
}

/**
 * A quick, intuitive time picker: a single dropdown of preset times with
 * friendly AM/PM labels. Supports native type-to-jump. Submits "HH:MM" (24h)
 * so it drops in wherever an <input type="time"> was used.
 */
export default function TimeSelect({
  stepMinutes = 15,
  placeholder = "Select time",
  className = "",
  ...props
}: TimeSelectProps) {
  const options = buildTimeOptions(stepMinutes);

  // Keep a preselected time (e.g. an existing event's) even if it doesn't land
  // on the interval grid, so editing never silently drops the value.
  const current = (props.value ?? props.defaultValue) as string | undefined;
  if (current && !options.some((option) => option.value === current)) {
    options.push({ value: current, label: formatTimeLabel(current) });
    options.sort((a, b) => a.value.localeCompare(b.value));
  }

  return (
    <div className="relative">
      <select
        className={`w-full appearance-none cursor-pointer rounded-lg bg-gray-100 p-3 pr-10 text-slate-600 outline-none focus:ring-1 focus:ring-indigo-400 ${className}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
        <FaAngleDown />
      </span>
    </div>
  );
}
