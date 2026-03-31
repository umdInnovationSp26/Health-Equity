"use client";
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "./components/footer";

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>HealthEquityNorthland</title>
        <meta name="description" content="HealthEquityNorthland" />
        <link rel="canonical" href="https://HealthEquityNorthland.org/" />
      </Head>

      <Navbar />
      <main className="bg-gradient-to-b from-white to-white relative min-h-screen flex flex-col justify-center items-center text-center overflow-hidden">
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0" />
        {/* MAIN CONTENT (on top) */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-40 flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Left: copy + CTA */}
          <div className="w-full text-center lg:text-left">
            <div className="flex flex-col">
              <div className="text-black text-6xl font-extrabold leading-tight">
                Welcome, Mary
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-gray-500 text-2xl font-normal leading-tight">
                Manage your events, check-ins, and produce all in one place
              </div>
              <button
                className="cursor-pointer hover:scale-105 transition w-full bg-[var(--colorAccent)] text-white py-3 rounded-full">
                  Events
              </button>
            </div>
          </div>

        </section>{" "}
      </main>

      <Footer />
    </>
  );
}
