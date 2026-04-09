"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/app/lib/firebaseClient";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { collection, getDocs, onSnapshot, doc } from "firebase/firestore";
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

Chart.register(
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  ArcElement,
  DoughnutController
);

/* ─── Types ─────────────────────────────────────────────── */
type Event = {
  id: string;
  title: string;
  category: "Outreach" | "Produce Supply" | "Volunteer" | "Community";
  date: string;       // ISO string
  startTime: string;  // e.g. "1:00 PM"
  endTime: string;
  location: string;
  imageUrl?: string;
};

type ProduceStat = {
  name: string;
  lbs: number;
};

type AttendanceStat = {
  month: string;
  avg: number;
};

/* ─── Fake data (swap with Firestore reads later) ────────── */
const FAKE_EVENTS: Event[] = [
  {
    id: "1",
    title: "Craft Night",
    category: "Outreach",
    date: "2026-03-15",
    startTime: "1:00 PM",
    endTime: "3:00 PM",
    location: "Peace Church, Duluth, MN",
  },
  {
    id: "2",
    title: "Farmers Market",
    category: "Produce Supply",
    date: "2026-03-31",
    startTime: "1:00 PM",
    endTime: "3:00 PM",
    location: "Peace Church, Duluth, MN",
  },
  {
    id: "3",
    title: "Volunteer Orientation",
    category: "Volunteer",
    date: "2026-04-05",
    startTime: "10:00 AM",
    endTime: "11:30 AM",
    location: "Community Center, Duluth, MN",
  },
  {
    id: "4",
    title: "Community Dinner",
    category: "Community",
    date: "2026-04-12",
    startTime: "5:00 PM",
    endTime: "7:00 PM",
    location: "St. Mary's Hall, Duluth, MN",
  },
];

const FAKE_PRODUCE: ProduceStat[] = [
  { name: "Pumpkin", lbs: 100 },
  { name: "Onions", lbs: 20 },
  { name: "Lettuce", lbs: 15 },
  { name: "Squash", lbs: 10 },
];

const FAKE_ATTENDANCE: AttendanceStat[] = [
  { month: "Jan", avg: 108 },
  { month: "Feb", avg: 115 },
  { month: "Mar", avg: 122 },
  { month: "Apr", avg: 145 },
  { month: "May", avg: 180 },
  { month: "Jun", avg: 162 },
  { month: "Jul", avg: 148 },
  { month: "Aug", avg: 135 },
  { month: "Sep", avg: 120 },
  { month: "Oct", avg: 110 },
  { month: "Nov", avg: 105 },
  { month: "Dec", avg: 98 },
];

/* ─── Helpers ────────────────────────────────────────────── */
const CATEGORY_COLORS: Record<Event["category"], string> = {
  Outreach: "bg-pink-100 text-pink-800",
  "Produce Supply": "bg-green-100 text-green-800",
  Volunteer: "bg-blue-100 text-blue-800",
  Community: "bg-amber-100 text-amber-800",
};

const PRODUCE_COLORS = ["#378ADD", "#85B7EB", "#B5D4F4", "#185FA5"];

function formatEventDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function EventIllustration({ category }: { category: Event["category"] }) {
  if (category === "Outreach") {
    return (
      <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-xl bg-pink-100">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="12" fill="#F4C0D1" />
          <path d="M10 18 Q18 8 26 18 Q18 28 10 18Z" fill="#D4537E" />
        </svg>
      </div>
    );
  }
  if (category === "Produce Supply") {
    return (
      <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-xl bg-green-100">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle cx="14" cy="22" r="6" fill="#639922" opacity=".5" />
          <circle cx="23" cy="17" r="5" fill="#BA7517" opacity=".6" />
          <circle cx="20" cy="24" r="4" fill="#E24B4A" opacity=".5" />
        </svg>
      </div>
    );
  }
  if (category === "Volunteer") {
    return (
      <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="13" r="5" fill="#85B7EB" />
          <path d="M8 30c0-5.52 4.48-10 10-10s10 4.48 10 10" stroke="#378ADD" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M18 6l3.09 6.26L28 13.27l-5 4.87 1.18 6.86L18 22l-6.18 3-1.18-6.86-5-4.87 6.91-1.01L18 6z" fill="#EF9F27" />
      </svg>
    </div>
  );
}

/* ─── Event Card ─────────────────────────────────────────── */
function EventCard({ event }: { event: Event }) {
  return (
    <Link href={`/event/${event.id}`} className="block">
      <div className="flex gap-3 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-[72px] w-[72px] flex-shrink-0 rounded-xl object-cover"
          />
        ) : (
          <EventIllustration category={event.category} />
        )}
        <div className="min-w-0 flex-1">
          <span
            className={`mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[event.category]}`}
          >
            {event.category}
          </span>
          <p className="mb-1.5 truncate text-sm font-semibold text-gray-900">
            {event.title}
          </p>
          <div className="space-y-1">
            <MetaRow icon="calendar">
              {formatEventDate(event.date)} · {event.startTime}
            </MetaRow>
            <MetaRow icon="location">{event.location}</MetaRow>
            <MetaRow icon="clock">
              {event.startTime} – {event.endTime}
            </MetaRow>
          </div>
        </div>
      </div>
    </Link>
  );
}

function MetaRow({
  icon,
  children,
}: {
  icon: "calendar" | "location" | "clock";
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      {icon === "calendar" && (
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0">
          <rect x="2" y="3" width="12" height="11" rx="1" />
          <line x1="5" y1="1" x2="5" y2="5" />
          <line x1="11" y1="1" x2="11" y2="5" />
          <line x1="2" y1="7" x2="14" y2="7" />
        </svg>
      )}
      {icon === "location" && (
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0">
          <circle cx="8" cy="7" r="3" />
          <path d="M8 2C5.24 2 3 4.24 3 7c0 4 5 9 5 9s5-5 5-9c0-2.76-2.24-5-5-5z" />
        </svg>
      )}
      {icon === "clock" && (
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0">
          <circle cx="8" cy="8" r="6" />
          <polyline points="8 5 8 8 10 10" />
        </svg>
      )}
      <span className="truncate">{children}</span>
    </div>
  );
}

/* ─── Attendance Chart ───────────────────────────────────── */
function AttendanceChart({ data }: { data: AttendanceStat[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
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
            ticks: { font: { size: 11 }, color: "#888780", maxRotation: 0, autoSkip: false },
          },
          y: {
            min: 80,
            max: 200,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { font: { size: 11 }, color: "#888780", stepSize: 50 },
          },
        },
      },
      plugins: [peakPlugin],
    });

    return () => chartRef.current?.destroy();
  }, [data]);

  return (
    <div className="relative h-[180px] w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Area chart showing average monthly event attendance throughout the year"
      />
    </div>
  );
}

/* ─── Produce Chart ──────────────────────────────────────── */
function ProduceChart({ data }: { data: ProduceStat[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
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
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} lbs` } },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [data]);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[130px] w-[130px] flex-shrink-0">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Donut chart of produce sold this month by item"
        />
      </div>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center gap-2 text-xs text-gray-500">
            <div
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ background: PRODUCE_COLORS[i] }}
            />
            <span>
              {item.name}{" "}
              <span className="font-semibold text-gray-900">{item.lbs} lbs</span>
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

/* ─── Stat Card ──────────────────────────────────────────── */
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="mb-1 text-[13px] text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function HomePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [firstName, setFirstName] = useState("");
  const [events, setEvents] = useState<Event[]>(FAKE_EVENTS);
  const [produce, setProduce] = useState<ProduceStat[]>(FAKE_PRODUCE);
  const [attendance] = useState<AttendanceStat[]>(FAKE_ATTENDANCE);
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

      /* Load user's first name */
      const userRef = doc(db, "users", currentUser.uid);
      const unsubDoc = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          setFirstName(snap.data().firstName ?? "");
        }
        setLoading(false);
      });

      return () => unsubDoc();
    });

    return () => unsub();
  }, [router]);

  /* Load real events from Firestore (replaces fake data when available) */
  useEffect(() => {
    if (!user) return;

    const eventsRef = collection(db, "event");
    const unsub = onSnapshot(eventsRef, (snap) => {
      if (snap.empty) return; // keep fake data if collection empty
      const loaded: Event[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Event, "id">),
      }));
      // Sort by date ascending, show only upcoming
      const now = new Date().toISOString().split("T")[0];
      const upcoming = loaded
        .filter((e) => e.date >= now)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (upcoming.length > 0) setEvents(upcoming);
    });

    return () => unsub();
  }, [user]);

  /* Load real produce stats from Firestore (replaces fake data when available) */
  useEffect(() => {
    if (!user) return;

    const produceRef = collection(db, "produceStats");
    getDocs(produceRef).then((snap) => {
      if (snap.empty) return;
      const loaded: ProduceStat[] = snap.docs.map((d) => ({
        name: d.data().name,
        lbs: d.data().lbs,
      }));
      if (loaded.length > 0) setProduce(loaded);
    });
  }, [user]);

  const upcomingEvents = events
    .filter((e) => e.date >= new Date().toISOString().split("T")[0])
    .slice(0, 4);

  const totalLbs = produce.reduce((sum, p) => sum + p.lbs, 0);
  const peakAttendance = Math.max(...attendance.map((a) => a.avg));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>HealthEquityNorthland</title>
        <meta name="description" content="HealthEquityNorthland" />
        <link rel="canonical" href="https://HealthEquityNorthland.org/" />
      </Head>

      <Navbar />
      <main className="pt-30 min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Greeting */}
        <h1 className="text-xl font-semibold text-gray-900">
          Welcome{firstName ? `, ${firstName}` : ""}
        </h1>

        {/* Stat pills */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Upcoming events" value={upcomingEvents.length} />
          <StatCard label="Produce this month" value={`${totalLbs} lbs`} />
          <StatCard label="Peak attendance" value={`${peakAttendance}`} />
        </div>

        {/* Upcoming events */}
        <div className="shadow-sm rounded-xl bg-blue-50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Upcoming events</h2>
            <Link
              href="/events"
              className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-700"
            >
              View all
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 4 10 8 6 12" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
            {upcomingEvents.length === 0 && (
              <p className="col-span-2 py-4 text-center text-sm text-gray-400">
                No upcoming events
              </p>
            )}
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div className="shadow-sm rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-500">
              Average event attendance (monthly)
            </h2>
            <AttendanceChart data={attendance} />
          </div>

          <div className="shadow-sm rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-500">
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
