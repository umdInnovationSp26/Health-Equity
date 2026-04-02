/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  sendEmailVerification,
  User,
  signOut,
} from "firebase/auth";
import { auth, db } from "@/app/lib/firebaseClient";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Loader } from "lucide-react";
import Navbar from "@/app/components/navbar";

const ADMIN_BYPASS_EMAILS = [
  "123@gmail.com",
  "owenmcrandall@gmnail.com",
  // add other admin emails here
];

export default function VerifyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seconds left to resend
  const [message, setMessage] = useState(""); // inline message

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/signin");
    } catch (err) {
      console.error("Error signing out:", err);
      setMessage("Failed to log out. Please try again.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/signin");
        return;
      }

      setUser(u);

      // 1) If Firebase Auth says verified, go to dashboard (authoritative).
      if (u.emailVerified) {
        router.push("/profile");
        return;
      }

      // 2) Otherwise read Firestore boolean.
      try {
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as any;

          // keep local bool in sync
          setEmailVerified(!!data.emailVerified);

          // keep Firestore's emailVerified in sync with auth (best-effort)
          try {
            await updateDoc(userRef, { emailVerified: u.emailVerified });
          } catch (err) {
            // ignore update errors
            console.error("Failed to update Firestore emailVerified:", err);
          }

          // Admin bypass: if this is an admin email and Firestore boolean is true, allow bypass
          const isAdmin = !!u.email && ADMIN_BYPASS_EMAILS.includes(u.email);
          if (isAdmin && data.emailVerified === true) {
            router.push("/dashboard");
            return;
          }
        } else {
          // no user doc yet — ensure local state is consistent
          setEmailVerified(false);
        }
      } catch (err) {
        console.error("Error reading user doc:", err);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (emailVerified) {
      // For safety: only redirect here if auth user is verified OR they are admin
      const current = auth.currentUser;
      const isAdmin =
        !!current?.email && ADMIN_BYPASS_EMAILS.includes(current.email);
      if (current?.emailVerified || isAdmin) {
        router.push("/dashboard");
      }
    }
  }, [emailVerified, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!user || cooldown > 0) return;
    try {
      await sendEmailVerification(user);
      setCooldown(120); // 2 minutes
      setMessage("Verification email sent! Check your inbox.");
    } catch (err) {
      console.error("Error sending email:", err);
      setMessage("Failed to send verification email. Please try again later.");
    }
  };

  const handleRefresh = async () => {
    if (!user) return;

    // Refresh logic: read Firestore boolean and decide
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data() as any;
        setEmailVerified(!!data.emailVerified);

        // If auth says verified -> go. If admin AND Firestore bool true -> go.
        if (user.emailVerified) {
          router.push("/dashboard");
          return;
        }
        const isAdmin =
          !!user.email && ADMIN_BYPASS_EMAILS.includes(user.email);
        if (isAdmin && data.emailVerified === true) {
          router.push("/dashboard");
          return;
        }

        setMessage("Email not verified yet. Click 'Resend Email' if needed.");
      }
    } catch (err) {
      console.error("Error refreshing verification state:", err);
      setMessage("Failed to refresh. Try again.");
    }
  };

  // -----------------------
  // Loading state: show full-page spinner
  // -----------------------
  if (!user) {
    return (
      <main className="bg-[var(--lightGray)] relative min-h-[100dvh] w-full flex items-center justify-center">
        <Loader className="animate-spin w-12 h-12 text-black" />
      </main>
    );
  }

  // -----------------------
  // Main card once user is loaded
  // -----------------------
  return (
    <main className="text-black bg-white relative min-h-[100dvh] w-full flex items-center justify-center text-center">
      <Navbar />
      <div className="bg-white border-3 border-gray-200 rounded-xl relative z-10 w-[90%] max-w-xl p-10">
        <h1 className="mb-4 text-3xl font-extrabold tracking-tight">
          Email Verification
        </h1>

        <div className="flex flex-col gap-5">
          <p className="text-xl">Signed in as {user.email}</p>

          {/* RESEND BUTTON */}
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className={`hover:scale-105 scursor-pointertransition transition text-xl px-6 py-2 rounded-xl text-white
            ${
              cooldown > 0
                ? "bg-gray-400 cursor-not-allowed"
                : "cursor-pointer bg-black hover:scale-110"
            }`}
          >
            {cooldown > 0
              ? `Resend in ${Math.floor(cooldown / 60)}:${String(
                  cooldown % 60
                ).padStart(2, "0")}`
              : "Resend Email"}
          </button>

          {/* REFRESH BUTTON */}
          <button
            onClick={handleRefresh}
            className="hover:scale-105 cursor-pointer transition text-xl px-6 py-2 rounded-xl bg-black text-white"
          >
            Refresh
          </button>
          

          {/* MESSAGE */}
          {message && (
            <p className="text-xs md:text-base w-full rounded-full bg-white text-red-400 font-semibold py-3 transition">
              {" "}
              {message}
            </p>
          )}
        </div>


        
          {/* LOGOUT BUTTON */}
          <button
            onClick={handleLogout}
            className="mt-6 text-black hover:underline text-md cursor-pointer"
          >
            Back to Sign In
          </button>

      </div>
    </main>
  );
}
