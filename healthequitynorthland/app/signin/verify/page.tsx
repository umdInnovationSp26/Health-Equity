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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/");
        return;
      }

      setUser(u);

      if (u.emailVerified) {
        router.push("/");
        return;
      }

      try {
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          setEmailVerified(!!data.emailVerified);

          try {
            await updateDoc(userRef, { emailVerified: u.emailVerified });
          } catch (err) {
            console.error("Failed to update Firestore emailVerified:", err);
          }

          const isAdmin = !!u.email && ADMIN_BYPASS_EMAILS.includes(u.email);
          if (isAdmin && data.emailVerified === true) {
            router.push("/");
            return;
          }
        } else {
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
      const current = auth.currentUser;
      const isAdmin =
        !!current?.email && ADMIN_BYPASS_EMAILS.includes(current.email);
      if (current?.emailVerified || isAdmin) {
        router.push("/");
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
      setCooldown(120);
      setMessage("Verification email sent! Check your inbox.");
      setIsSuccess(true);
    } catch (err) {
      console.error("Error sending email:", err);
      setMessage("Failed to send verification email. Please try again later.");
      setIsSuccess(false);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data() as any;
        setEmailVerified(!!data.emailVerified);

        if (user.emailVerified) {
          router.push("/profile");
          return;
        }
        const isAdmin =
          !!user.email && ADMIN_BYPASS_EMAILS.includes(user.email);
        if (isAdmin && data.emailVerified === true) {
          router.push("/profile");
          return;
        }

        setMessage("Email not verified yet. Click 'Resend Email' if needed.");
        setIsSuccess(false);
      }
    } catch (err) {
      console.error("Error refreshing verification state:", err);
      setMessage("Failed to refresh. Try again.");
      setIsSuccess(false);
    }
  };

  // Loading state
  if (!user) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader className="animate-spin w-10 h-10 text-blue-400" />
      </main>
    );
  }

  return (
    <>
      {/* <Navbar /> */}

      <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        {/* Outer card with blue border */}
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl flex flex-col sm:flex-row overflow-hidden">

          {/* ── Left panel: content ── */}
          <div className="flex-1 p-10 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verify Your Email
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Signed in as{" "}
              <span className="font-medium text-gray-700">{user.email}</span>
            </p>

            <div className="flex flex-col gap-4">
              {/* Info box */}
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
                We sent a verification link to your email. Please check your
                inbox and click the link to verify your account.
              </div>

              {/* Feedback message */}
              {message && (
                <p className={`text-xs font-medium ${isSuccess ? "text-green-500" : "text-red-500"}`}>
                  {message}
                </p>
              )}

              {/* Refresh button — primary */}
              <button
                onClick={handleRefresh}
                className="mt-1 w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-semibold text-sm transition cursor-pointer"
              >
                I&apos;ve Verified — Continue
              </button>

              {/* Resend button — secondary */}
              <button
                onClick={handleResend}
                disabled={cooldown > 0}
                className="w-full py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 active:scale-95 text-gray-700 font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {cooldown > 0
                  ? `Resend in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")}`
                  : "Resend Verification Email"}
              </button>

              {/* Back to Sign In */}
              <p className="text-center text-xs text-gray-500 mt-1">
                <button
                  onClick={handleLogout}
                  className="hover:underline text-gray-600 font-medium cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </p>
            </div>
          </div>

          {/* ── Right panel: logo ── */}
          <div className="hidden sm:flex flex-1 items-center justify-center bg-white border-l border-gray-100 p-10">
            {/* Update src to your actual logo path, e.g. "/images/logo.png" */}
            <img
              src="/HENsignin.png"
              alt="Health Equity Northland"
              className="max-w-[500px] w-full object-contain"
            />
          </div>
        </div>
      </main>
    </>
  );
}
