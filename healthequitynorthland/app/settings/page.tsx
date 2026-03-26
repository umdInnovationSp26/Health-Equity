"use client";

import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";

import { useEffect, useState } from "react";
import { auth, db } from "@/app/lib/firebaseClient";
import { doc, onSnapshot } from "firebase/firestore";
import Settings from "@/app/components/settings";

export default function DashboardPage() {
  const [themeColor, setThemeColor] = useState<string>("#ffffffff");

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;
      const userRef = doc(db, "users", user.uid);

      const unsubscribeSnap = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setThemeColor(data.themeColor ?? "#ffffff");
        }
      });

      return () => unsubscribeSnap();
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <div
      className="min-h-screen flex transition-colors duration-300"
      style={{ backgroundColor: themeColor }}
    >
      <div className="flex-1">
        <Navbar />
        <Settings />
        <Footer />
      </div>
    </div>
  );
}
