"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/app/lib/firebaseClient";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from "chart.js";
import { useRouter } from "next/navigation";

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);


export default function InventoryPage(){
const d = new Date();
const router = useRouter();

    return (
        <>
        <Navbar />

        <header className="bg-blue-600 text-white py-4">
            <div className="container mx-auto px-4">
                <h1 className="text-2xl font-bold">Inventory Page</h1>
            </div>
        </header>

        <br />

        <h1 className="text-3xl font-bold text-center mt-8">
            New Inventory Register {d.toLocaleString()}
        </h1>

        <br />
        <br />
        <br />

         <div className="flex flex-col gap-4 m-4 max-w-3xl mx-auto">
           <a
            href="/produce/inventory/addRemove"    
            className="flex items-center justify-between w-full p-6 bg-blue-500 border border-gray-200 rounded-xl transition-transform duration-200 hover:scale-[1.01] shadow-sm"
            >
            <h1 className="text-lg font-semibold text-white">Add/Remove from Existing Inventory</h1>

            </a>
         </div>
         <div className="flex flex-col gap-4 m-4 max-w-3xl mx-auto">
           <a
          
            href="/produce/inventory/setInventory"
            className="flex items-center justify-between w-full p-6 bg-blue-500 border border-gray-200 rounded-xl transition-transform duration-200 hover:scale-[1.01] shadow-sm"
            >
            <h1 className="text-lg font-semibold text-white">Set New Inventory Levels</h1>

            </a>
         </div>

        




        </>
    )
}