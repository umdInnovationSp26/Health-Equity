"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/app/lib/firebaseClient";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import Head from "next/head";
import Link from "next/link";
import { Chart, ArcElement, DoughnutController, Tooltip } from "chart.js";

Chart.register(ArcElement, DoughnutController, Tooltip);

type ProduceStat = {
  name: string;
  lbs: number;
};

const PRODUCE_COLORS = [
  "#378ADD",
  "#85B7EB",
  "#B5D4F4",
  "#185FA5",
  "#F4C0D1",
  "#D4537E",
];

export default function ProducePage() {
  const [produce, setProduce] = useState<ProduceStat[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const produceRef = collection(db, "produceStats");
    getDocs(produceRef).then((snap) => {
      const loaded: ProduceStat[] = snap.docs.map((d) => ({
        name: d.data().name,
        lbs: d.data().lbs,
      }));
      setProduce(loaded);
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: produce.map((p) => p.name),
        datasets: [
          {
            data: produce.map((p) => p.lbs),
            backgroundColor: PRODUCE_COLORS.slice(0, produce.length),
            borderColor: "#fff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "50%",
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { boxWidth: 12, padding: 12 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.parsed} lbs`,
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [produce]);

  const totalLbs = produce.reduce((sum, p) => sum + p.lbs, 0);

  return (
    <>
      <Head>
        <title>Produce Stats | HealthEquityNorthland</title>
        <meta
          name="description"
          content="HealthEquityNorthland Produce Stats"
        />
      </Head>

      <Navbar />
      <main className="pt-30 min-h-screen px-4 py-10">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Produce</h1>
          </div>

          {/* Total produce */}
          <div className="rounded-xl bg-white shadow-sm p-6">
            <p className="text-sm text-gray-500">Total Produce This Month</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {totalLbs} lbs
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
