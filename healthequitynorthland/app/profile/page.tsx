"use client";

import Navbar from "@/app/components/navbar";

import { useEffect, useState } from "react";
import { auth, db } from "@/app/lib/firebaseClient";
import { doc, onSnapshot } from "firebase/firestore";
import Settings from "@/app/components/profile";
import Footer from "../components/footer";

export default function DashboardPage() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);

      const unsubscribeSnap = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const isDark = data.darkMode ?? false;

          setDarkMode(isDark);

          // 🔥 THIS is the key part
          document.documentElement.classList.toggle("dark", isDark);
        }
      });

      return () => unsubscribeSnap();
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <div className="min-h-screen flex transition-colors duration-300">
      <div className="flex-1">
        <Navbar />
        <Settings />
        <Footer/>
      </div>
    </div>
  );
}