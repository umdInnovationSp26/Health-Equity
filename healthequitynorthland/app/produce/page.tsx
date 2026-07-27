"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/app/lib/firebaseClient";
import { collection, getDocs } from "firebase/firestore";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from "chart.js";
import { ButtonLink } from "@/app/components/button";
import InventoryTable from "@/app/produce/inventory/components/InventoryTable";
import ProduceChart from "@/app/produce/inventory/components/ProduceChart"
Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

type ProduceStat = {
  name: string;
  lbs: number;
};


type Contact = {
  id: string;
  name: string;
  email: string;
  phone?: string;
};

export default function ProducePage() {
  const [produce, setProduce] = useState<ProduceStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduce = async () => {
      setLoading(true);
      try {
        // 1. Get all events
        const eventsSnap = await getDocs(collection(db, "event"));

        // 2. For each event, fetch its produce subcollection
        const allProduceSnaps = await Promise.all(
          eventsSnap.docs.map((eventDoc) =>
            getDocs(collection(db, "event", eventDoc.id, "produce")),
          ),
        );

        // 3. Aggregate lbs by produce name across all events
        const totals: Record<string, number> = {};
        allProduceSnaps.forEach((snap) => {
          snap.docs.forEach((d) => {
            const name = d.id; // doc ID is the produce name
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

      setLoading(false);
    };

    loadContacts();
  }, []);

  return (
    <>
      <Navbar />

      <main className="pt-20 min-h-screen">
        {/* Top bar with search */}
        <div className="bg-white shadow-sm flex flex-col sm:flex-row items-center justify-between p-4 gap-3 sm:gap-2 sm:relative">
          <h3 className="text-black font-bold sm:absolute sm:left-1/2 sm:-translate-x-1/2">
            Produce
          </h3>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto sm:ml-auto">
            <ButtonLink
              href="/produce/inventory/reportHarvest"
              variant="success"
              className="whitespace-nowrap"
            >
              Report Harvest
            </ButtonLink>

            <ButtonLink
              href="/produce/inventory/setInventory"
              variant="success"
              className="whitespace-nowrap"
            >
              Set New Inventory Levels
            </ButtonLink>
          </div>
        </div>
        {/* Search + sort */}
        <div className="mx-auto max-w-2xl space-y-5 p-6">
          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-500">
                Currently Held Produce
              </h2>
              <ProduceChart data={produce} />
              <InventoryTable data={produce} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}


