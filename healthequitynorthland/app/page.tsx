"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/app/lib/firebaseClient";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  Timestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Chart,
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  ArcElement,
  DoughnutController,
  Plugin,
} from "chart.js";
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "./components/footer";
import { getEventType } from "@/app/lib/eventTypeUtil";
import { convertTimestampToDate } from "@/app/lib/dateTimeUtil";

Chart.register(
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  ArcElement,
  DoughnutController,
);

/* ─── Types ─────────────────────────────────────────────── */
type FirestoreEvent = {
  id: string;
  title: string;
  description: string;
  eventType: string;
  location: string;
  dateStart: string;
  dateEnd: string;
  attendees: number;
  timestampStart: Timestamp | null;
};

type ProduceStat = {
  name: string;
  lbs: number;
};

type AttendanceStat = {
  month: string;
  avg: number;
};

/* ─── Chart colors ───────────────────────────────────────── */
const PRODUCE_COLORS = [
  "#378ADD",
  "#85B7EB",
  "#B5D4F4",
  "#185FA5",
  "#0C447C",
  "#63A3D9",
];

/* ─── Event styles ────────────────────────────────────── */
const EVENT_STYLES: Record<string, { bg: string; text: string; dot: string }> =
  {
    Outreach: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-400" },
    "Produce Supply": {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-emerald-400",
    },
    Volunteer: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-400" },
    Community: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-400",
    },
  };

function getEventStyle(cat: string) {
  return (
    EVENT_STYLES[cat] ?? {
      bg: "bg-gray-100",
      text: "text-gray-700",
      dot: "bg-gray-400",
    }
  );
}

/* ─── Event Card ─────────────────────────────────────────── */
function EventCard({ event, index }: { event: FirestoreEvent; index: number }) {
  const style = getEventStyle(event.eventType);
  return (
    <Link
      href={`/events/${event.id}`}
      className="group block"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative flex flex-col gap-3 rounded-2xl bg-white border border-slate-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200 overflow-hidden">
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 ${style.dot} opacity-60`}
        />
        <span
          className={`self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${style.bg} ${style.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          {event.eventType}
        </span>
        <h3 className="text-[15px] font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
          {event.title}
        </h3>
        {event.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}
        <div className="mt-auto space-y-1.5 pt-1 border-t border-slate-50">
          <MetaRow icon="calendar">
            {new Date(event.dateStart).toLocaleDateString()}
          </MetaRow>
          <MetaRow icon="location">{event.location || "Location TBD"}</MetaRow>
          {event.attendees > 0 && (
            <MetaRow icon="people">{event.attendees} attendees</MetaRow>
          )}
        </div>
        <span className="absolute bottom-5 right-5 text-slate-200 text-lg group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all duration-200">
          →
        </span>
      </div>
    </Link>
  );
}

function MetaRow({
  icon,
  children,
}: {
  icon: "calendar" | "location" | "people";
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      {icon === "calendar" && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="flex-shrink-0 text-slate-400"
        >
          <rect x="2" y="3" width="12" height="11" rx="1.5" />
          <line x1="5" y1="1" x2="5" y2="5" />
          <line x1="11" y1="1" x2="11" y2="5" />
          <line x1="2" y1="7" x2="14" y2="7" />
        </svg>
      )}
      {icon === "location" && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="flex-shrink-0 text-slate-400"
        >
          <path d="M8 2C5.24 2 3 4.24 3 7c0 4 5 9 5 9s5-5 5-9c0-2.76-2.24-5-5-5z" />
          <circle cx="8" cy="7" r="2" />
        </svg>
      )}
      {icon === "people" && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="flex-shrink-0 text-slate-400"
        >
          <circle cx="6" cy="5" r="2.5" />
          <path d="M1 14c0-3.31 2.24-5 5-5s5 1.69 5 5" strokeLinecap="round" />
          <circle cx="12" cy="5" r="2" />
          <path d="M15 14c0-2.5-1.5-4-3-4.5" strokeLinecap="round" />
        </svg>
      )}
      <span className="truncate">{children}</span>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────── */
function EmptyEvents() {
  return (
    <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-slate-400"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-600">No upcoming events</p>
      <p className="mt-1 text-xs text-slate-400">
        Events you create will appear here
      </p>
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────── */
function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 ${accent}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
          {label}
        </p>
        <div className="opacity-50">{icon}</div>
      </div>
      <p className="text-2xl font-bold leading-none">{value}</p>
    </div>
  );
}

/* ─── Attendance Chart ───────────────────────────────────── */
function AttendanceChart({ data }: { data: AttendanceStat[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    chartRef.current?.destroy();

    const peakPlugin: Plugin = {
      id: "peakLabel",
      afterDraw(chart) {
        const values = data.map((d) => d.avg);
        const maxVal = Math.max(...values);
        const maxIdx = values.indexOf(maxVal);
        const meta = chart.getDatasetMeta(0);
        const pt = meta.data[maxIdx];
        if (!pt) return;
        const { ctx } = chart;
        ctx.save();
        ctx.fillStyle = "#378ADD";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0C447C";
        ctx.font = "500 11px sans-serif";
        ctx.fillText(`${maxVal} people`, pt.x + 7, pt.y - 5);
        ctx.restore();
      },
    };

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: data.map((d) => d.month),
        datasets: [
          {
            data: data.map((d) => d.avg),
            fill: true,
            backgroundColor: "rgba(55,138,221,0.12)",
            borderColor: "#378ADD",
            borderWidth: 2,
            tension: 0.45,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "#378ADD",
          },
          {
            data: data.map((d) => Math.round(d.avg * 0.7)),
            fill: true,
            backgroundColor: "rgba(133,183,235,0.10)",
            borderColor: "rgba(133,183,235,0.5)",
            borderWidth: 1.5,
            tension: 0.45,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => ` ${ctx.parsed.y} people` },
            backgroundColor: "#fff",
            borderColor: "#B5D4F4",
            borderWidth: 1,
            titleColor: "#0C447C",
            bodyColor: "#185FA5",
            padding: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11 },
              color: "#888780",
              maxRotation: 0,
              autoSkip: false,
            },
          },
          y: {
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { font: { size: 11 }, color: "#888780", stepSize: 50 },
          },
        },
      },
      plugins: [peakPlugin],
    });

    return () => chartRef.current?.destroy();
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-[180px] flex-col items-center justify-center gap-1 text-center text-xs text-slate-400">
        <span>No attendance data yet.</span>
        <span>
          Add documents to{" "}
          <code className="rounded bg-slate-100 px-1">attendanceStats</code>.
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-[180px] w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Average monthly event attendance"
      />
    </div>
  );
}

/* ─── Produce Chart ──────────────────────────────────────── */
function ProduceChart({ data }: { data: ProduceStat[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: data.map((d) => d.name),
        datasets: [
          {
            data: data.map((d) => d.lbs),
            backgroundColor: PRODUCE_COLORS.slice(0, data.length),
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "50%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} lbs` },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-[130px] flex-col items-center justify-center gap-1 text-center text-xs text-slate-400">
        <span>No produce data yet.</span>
        <span>
          Add documents to{" "}
          <code className="rounded bg-slate-100 px-1">produceStats</code>.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[130px] w-[130px] flex-shrink-0">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Produce sold this month by item"
        />
      </div>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div
            key={`${item.name}-${i}`}
            className="flex items-center gap-2 text-xs text-slate-500"
          >
            <div
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ background: PRODUCE_COLORS[i] }}
            />
            <span>
              {item.name}{" "}
              <span className="font-semibold text-slate-900">
                {item.lbs} lbs
              </span>
            </span>
          </div>
        ))}
        <Link
          href="/produce"
          className="mt-1 block text-xs font-medium text-blue-500 hover:text-blue-700"
        >
          See all →
        </Link>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function HomePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [firstName, setFirstName] = useState("");
  const [upcomingEvents, setUpcomingEvents] = useState<FirestoreEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [produce, setProduce] = useState<ProduceStat[]>([]);
  const [attendance, setAttendance] = useState<AttendanceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /* Auth listener */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/signin");
        return;
      }
      setUser(currentUser);

      const userRef = doc(db, "users", currentUser.uid);
      const unsubDoc = onSnapshot(userRef, (snap) => {
        if (snap.exists()) setFirstName(snap.data().firstName ?? "");
        setLoading(false);
      });

      return () => unsubDoc();
    });

    return () => unsub();
  }, [router]);

  /* Load events from Firestore */
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "event"), orderBy("timestampStart", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const now = Timestamp.now();
      const allEvents: FirestoreEvent[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || "Untitled Event",
          description: data.description || "",
          eventType: getEventType(data.eventType),
          location: data.location || "",
          dateStart: convertTimestampToDate(data.timestampStart),
          dateEnd: convertTimestampToDate(data.timestampEnd),
          attendees: data.attendees || 0,
          timestampStart: data.timestampStart ?? null,
        };
      });
      setTotalEvents(allEvents.length);
      const upcoming = allEvents
        .filter(
          (e) =>
            e.timestampStart && e.timestampStart.toMillis() >= now.toMillis(),
        )
        .slice(0, 2);
      setUpcomingEvents(upcoming);
    });
    return () => unsub();
  }, [user]);

  /* Load stats */
  useEffect(() => {
    if (!user) return;

    const MONTH_LABELS = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // 🔹 ATTENDANCE — check both `attendance` and `attendees` fields
    getDocs(collection(db, "event")).then((snap) => {
      const monthTotals: Record<number, { sum: number; count: number }> = {};

      snap.docs.forEach((d) => {
        const raw = d.data();
        const ts = raw.timestampStart as Timestamp | null | undefined;
        // try `attendance` first, fall back to `attendees`
        const val =
          typeof raw.attendance === "number"
            ? raw.attendance
            : typeof raw.attendees === "number"
              ? raw.attendees
              : 0;

        if (!ts || val === 0) return;

        const m = ts.toDate().getMonth();
        if (!monthTotals[m]) monthTotals[m] = { sum: 0, count: 0 };
        monthTotals[m].sum += val;
        monthTotals[m].count += 1;
      });

      const loaded: AttendanceStat[] = Object.entries(monthTotals)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([idx, { sum, count }]) => ({
          month: MONTH_LABELS[Number(idx)],
          avg: Math.round(sum / count),
        }));

      setAttendance(loaded);
    });

    // 🔹 PRODUCE — doc ID is the name, `lb` is the field (matching produce.tsx)
    if (upcomingEvents.length === 0) return;

    const eventId = upcomingEvents[0].id;
    getDocs(collection(db, "event", eventId, "produce")).then((snap) => {
      const loaded: ProduceStat[] = snap.docs
        .map((d) => ({
          name: d.id,
          lbs: (d.data().lb ?? 0) as number,
        }))
        .filter((p) => p.lbs > 0)
        .sort((a, b) => b.lbs - a.lbs);

      setProduce(loaded);
    });
  }, [user, upcomingEvents]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <svg
            className="animate-spin"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>HealthEquityNorthland</title>
        <meta name="description" content="HealthEquityNorthland dashboard" />
        <link rel="canonical" href="https://HealthEquityNorthland.org/" />
      </Head>

      <Navbar />

      <main className="min-h-screen px-4 pb-16 pt-28">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">{today}</p>
              <h1 className="text-2xl font-bold leading-tight">
                {firstName ? `Hi, ${firstName}` : "Welcome back"}
              </h1>
            </div>

            <div className="flex items-center gap-3">
            <Link
              href="/events/create"
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:scale-102 transition-colors"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="8" y1="2" x2="8" y2="14" />
                <line x1="2" y1="8" x2="14" y2="8" />
              </svg>
              New event
            </Link>

            <Link
            href="/produce/inventory/reportHarvest"
            className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 hover:scale-102 transition-colors"
            >
                Report Harvest

            </Link>

            </div>
          </div>

          {/* Stat pills */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Upcoming events"
              value={upcomingEvents.length}
              accent="bg-blue-600 text-white"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="2" y="3" width="12" height="11" rx="1.5" />
                  <line x1="5" y1="1" x2="5" y2="5" />
                  <line x1="11" y1="1" x2="11" y2="5" />
                  <line x1="2" y1="7" x2="14" y2="7" />
                </svg>
              }
            />
            <StatCard
              label="Total events"
              value={totalEvents}
              accent="bg-slate-800 text-white"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="1" y="1" width="6" height="6" rx="1" />
                  <rect x="9" y="1" width="6" height="6" rx="1" />
                  <rect x="1" y="9" width="6" height="6" rx="1" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                </svg>
              }
            />
          </div>

          {/* Upcoming events section */}
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-800">
                  Next upcoming events
                </h2>
              </div>
              <Link
                href="/events"
                className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors"
              >
                View all
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 4 10 8 6 12" />
                </svg>
              </Link>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, i) => (
                  <EventCard key={event.id} event={event} index={i} />
                ))
              ) : (
                <EmptyEvents />
              )}
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-500">
                Average event attendance (monthly)
              </h2>
              <AttendanceChart data={attendance} />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-500">
                Produce sold this month
              </h2>
              <ProduceChart data={produce} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
