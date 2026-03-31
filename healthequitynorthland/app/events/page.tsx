"use client";
import Head from "next/head";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";

export default function EventsPage() {
  return (
    <>
      <Head>
        <title>HealthEquityNorthland</title>
        <meta name="description" content="HealthEquityNorthland" />
        <link rel="canonical" href="https://HealthEquityNorthland.org/" />
      </Head>

      <Navbar />
      <main className="min-h-screen pt-20">
        {/* Dark overlay for contrast */}
        <div className="grid grid-cols-3 gap-1">
            <div className="grid grid-cols-3 grid-rows-1 content-start">
                <button className="cursor-pointer">
                    &lt;
                </button>
                <button className="btn-primary">
                    By Date
                </button>
                <button className="cursor-pointer">
                    Alphabetical
                </button>
            </div>
            <div>This is in column 2</div>

        </div>

      </main>

      <Footer />
    </>
  );
}
