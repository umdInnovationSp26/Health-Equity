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
        <div className="grid grid-cols-3 gap-1 border-b-2 border-gray-200 pb-4">
            <div className="content-start px-4">
                <button className="mx-4">
                    &lt;
                </button>
                <button className="outline mx-4">
                    By Date
                </button>
                <button className="outline mx-4">
                    Alphabetical
                </button>
            </div>
            <div className="content-center">
              <input type="text"
                id="inputId"
                placeholder="Search by Event Name"
                className="bg-[transparent] outline-none border-none w-full pl-2 pr-3" 
              />
            </div>
            <div className="content-end">
              <button className="outline mx-4">
                    View Calendar
                </button>
                <button className="outline mx-4">
                    Add New Event
                </button>
            </div>


        </div>

      </main>

      <Footer />
    </>
  );
}
