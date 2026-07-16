"use client";

import { FaMapMarkerAlt, FaLeaf } from "react-icons/fa";
import type { HarvestRecord } from "@/app/produce/inventory/lib/actions";

type RecentHarvestsProps = {
  data: HarvestRecord[];
  loading?: boolean;
};

/** "3 days ago", "just now", etc. - so users can gauge how fresh stock is. */
function formatAge(date: Date | null): string {
  if (!date) return "just now";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours !== 1 ? "s" : ""} ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} wk${diffWeeks !== 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Older stock is worth flagging - tint the age once produce ages past a week. */
function ageTone(date: Date | null): string {
  if (!date) return "text-slate-400";
  const diffDays = (Date.now() - date.getTime()) / 86_400_000;
  if (diffDays >= 14) return "text-red-500";
  if (diffDays >= 7) return "text-amber-500";
  return "text-slate-400";
}

export default function RecentHarvests({ data, loading }: RecentHarvestsProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-500">Recent Harvests</h2>

      {loading ? (
        <p className="text-sm text-slate-400">Loading harvests…</p>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
            <FaLeaf className="text-slate-300" size={18} />
          </div>
          <p className="text-sm font-medium text-slate-500">No harvests reported yet</p>
          <p className="text-xs text-slate-400">
            Use “Report Harvest” to log new produce as it comes in.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-50">
          {data.map((harvest) => (
            <li key={harvest.id} className="flex items-center gap-3 py-2.5">
              <div className="h-2 w-2 shrink-0 rounded-full bg-green-400" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {harvest.produceName}
                </p>
                {harvest.location && (
                  <p className="flex items-center gap-1 text-xs text-slate-400">
                    <FaMapMarkerAlt size={9} className="shrink-0" />
                    <span className="truncate">{harvest.location}</span>
                  </p>
                )}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-slate-700">{harvest.lbs} lbs</p>
                <p className={`text-xs ${ageTone(harvest.harvestedAt)}`}>
                  {formatAge(harvest.harvestedAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
