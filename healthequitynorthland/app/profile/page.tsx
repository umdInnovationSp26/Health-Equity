"use client";

import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";

import { useEffect, useState } from "react";
import { auth, db } from "@/app/lib/firebaseClient";
import { doc, onSnapshot } from "firebase/firestore";
import Profile from "@/app/components/profile";

export default function ProfilePage() {
  const [themeColor, setThemeColor] = useState<string>("#f8f7ffff");

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
        <Profile />
      </div>
    </div>
  );
}
