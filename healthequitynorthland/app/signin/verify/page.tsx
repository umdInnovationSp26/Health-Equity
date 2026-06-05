/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  sendEmailVerification,
  User,
  signOut,
} from "firebase/auth";
import { auth, db } from "@/app/lib/firebaseClient";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function VerifyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/signin");
    } catch (err) {
      console.error("Error signing out:", err);
      setMessage("Failed to log out. Please try again.");
      setIsSuccess(false);
    }
  };

  // ── AUTH + GATES ──
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/signin");
        return;
      }

      setUser(u);

      // Verification
      try {
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) return;

        const data = snap.data() as any;
        const firestoreVerified = !!data.emailVerified;
        const firebaseVerified = u.emailVerified;

        // Sync Firebase → Firestore
        try {
          await updateDoc(userRef, {
            emailVerified: firebaseVerified,
          });
        } catch (err) {
          console.error("Failed to update Firestore:", err);
        }

        if (firebaseVerified || firestoreVerified) {
          router.push("/");
        }
      } catch (err) {
        console.error("Error reading user doc:", err);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // ⏱ Cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // 📩 Resend
  const handleResend = async () => {
    if (!user || cooldown > 0) return;

    try {
      await sendEmailVerification(user);
      setCooldown(120);
      setMessage("Verification email sent! Check your Spam inbox.");
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      setMessage("Failed to send verification email.");
      setIsSuccess(false);
    }
  };

  // 🔄 Refresh
  const handleRefresh = async () => {
    if (!user) return;

    try {
      await user.reload();
      const refreshedUser = auth.currentUser;

      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) {
        setMessage("User record not found.");
        setIsSuccess(false);
        return;
      }

      const data = snap.data() as any;
      const firestoreVerified = !!data.emailVerified;
      const firebaseVerified = !!refreshedUser?.emailVerified;

      if (firebaseVerified || firestoreVerified) {
        router.push("/");
        return;
      }

      setMessage("Email not verified yet.");
      setIsSuccess(false);
    } catch (err) {
      console.error(err);
      setMessage("Failed to refresh.");
      setIsSuccess(false);
    }
  };

  // ⏳ Loading
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          Loading…
        </div>
      </div>
    );
  }

  // ✅ MAIN UI (unchanged)
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl flex flex-col sm:flex-row overflow-hidden">
        <div className="flex-1 p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verify Your Email
          </h2>

          <p className="text-sm text-gray-500 mb-6">
            Signed in as{" "}
            <span className="font-medium text-gray-700">
              {user.email}
            </span>
          </p>

          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
              Check your email for a verification link.
            </div>

            {message && (
              <p
                className={`text-xs font-medium ${
                  isSuccess ? "text-green-500" : "text-red-500"
                }`}
              >
                {message}
              </p>
            )}

            <button
              onClick={handleRefresh}
              className="w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm"
            >
              I’ve Verified — Continue
            </button>

            <button
              onClick={handleResend}
              disabled={cooldown > 0}
              className="w-full py-2.5 rounded-lg border text-sm"
            >
              {cooldown > 0
                ? `Resend in ${Math.floor(cooldown / 60)}:${String(
                    cooldown % 60
                  ).padStart(2, "0")}`
                : "Resend Verification Email"}
            </button>

            <p className="text-center text-xs text-gray-500">
              <button onClick={handleLogout} className="hover:underline">
                ← Back to Sign In
              </button>
            </p>
          </div>
        </div>

        <div className="hidden sm:flex flex-1 items-center justify-center border-l p-10">
          <img
            src="/HENsignin.png"
            alt="Health Equity Northland"
            className="max-w-[500px] w-full object-contain"
          />
        </div>
      </div>
    </main>
  );
}