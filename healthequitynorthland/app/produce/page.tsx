"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/app/lib/firebaseClient";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import { Chart } from "chart.js";

type ProduceStat = {
  name: string;
  lbs: number;
};

const PRODUCE_COLORS = [
  "#378ADD",
  "#85B7EB",
  "#B5D4F4",
  "#185FA5",
  "#0C447C",
  "#63A3D9",
];

type Contact = {
  id: string;
  name: string;
  email: string;
  phone?: string;
};

type SortKey = "name" | "email";

export default function ProducePage() {
  const [produce, setProduce] = useState<ProduceStat[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [loading, setLoading] = useState(true);

  /* Add contact state */
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
  const loadProduce = async () => {
    setLoading(true);
    try {
      // 1. Get all events
      const eventsSnap = await getDocs(collection(db, "event"));

      // 2. For each event, fetch its produce subcollection
      const allProduceSnaps = await Promise.all(
        eventsSnap.docs.map((eventDoc) =>
          getDocs(collection(db, "event", eventDoc.id, "produce"))
        )
      );

      // 3. Aggregate lbs by produce name across all events
      const totals: Record<string, number> = {};
      allProduceSnaps.forEach((snap) => {
        snap.docs.forEach((d) => {
          const name = d.id;           // doc ID is the produce name
          const lb = d.data().lb ?? 0;
          totals[name] = (totals[name] ?? 0) + lb;
        });
      });

      // 4. Convert to array and sort descending by lbs
      const loaded: ProduceStat[] = Object.entries(totals)
        .map(([name, lbs]) => ({ name, lbs: Math.round(lbs * 100) / 100 }))
        .sort((a, b) => b.lbs - a.lbs);

      setProduce(loaded);
    } catch (err) {
      console.error("Error loading produce:", err);
    } finally {
      setLoading(false);
    }
  };

  loadProduce();
}, []);

  /* Load contacts */
  useEffect(() => {
    const loadContacts = async () => {
      setLoading(true);

      const snap = await getDocs(collection(db, "contacts"));

      const data: Contact[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name || "Unnamed",
          email: d.email || "",
          phone: d.phone || "",
        };
      });

      setContacts(data);
      setLoading(false);
    };

    loadContacts();
  }, []);

  return (
    <>
      <Navbar />

      <main className="pt-20 min-h-screen">
        {/* Top bar with search */}
        <div className="bg-white shadow-sm flex items-center justify-between p-4 gap-2 relative">
          <div className="content-start px-4"></div>

          <h3 className="text-black absolute left-1/2 -translate-x-1/2 font-bold">
            Produce
          </h3>

          <div className="content-end text-right pr-4">
            <button
              onClick={() => setShowAdd(true)}
              className="bg-white rounded-xl px-3 sm:px-4 py-2 hover:scale-105 transition text-sm sm:text-base text-white"
            >
              ...
            </button>
          </div>
        </div>

        {/* Search + sort */}
        <div className="mx-auto max-w-2xl space-y-5 p-6">
          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4">
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
      </div>
    </div>
  );
}
