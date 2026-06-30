"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/app/lib/firebaseClient";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from "chart.js";



export default function InventoryPage(){


    return (
        <Navbar />
    )
}