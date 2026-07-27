/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/app/lib/firebaseClient";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/navbar";
import Button from "@/app/components/button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = async () => {
    if (!email) {
      setMessage("Please enter your email.");
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Check your inbox.");
      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Failed to send reset email.");
      setIsSuccess(false);
    }
    setLoading(false);
  };

  return (
    <>
      {/* <Navbar /> */}

      <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        {/* Outer card with blue border */}
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl flex flex-col sm:flex-row overflow-hidden">

          {/* ── Left panel: form ── */}
          <div className="flex-1 p-10 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter your email address and we&apos;ll send you a reset link.
            </p>

            <div className="flex flex-col gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    disabled={loading || isSuccess}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400 transition disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Feedback message */}
              {message && (
                <p className={`text-xs font-medium -mt-1 ${isSuccess ? "text-green-500" : "text-red-500"}`}>
                  {message}
                </p>
              )}

              {/* Send Reset Email button */}
              <Button
                variant="primary"
                onClick={handleReset}
                disabled={loading || isSuccess}
                className="mt-1 w-full"
              >
                {loading ? "Sending…" : isSuccess ? "Email Sent!" : "Send Reset Email"}
              </Button>

              {/* Back to Sign In */}
              <p className="text-center text-xs text-gray-500 mt-1">
                <button
                  onClick={() => router.push("/signin")}
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
