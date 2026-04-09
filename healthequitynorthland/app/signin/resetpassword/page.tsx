/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/app/lib/firebaseClient";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/navbar";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleReset = async () => {
    if (!email) {
      setMessage("Please enter your email");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Check your inbox");
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Failed to send reset email");
    }
    setLoading(false);
  };

  return (
    <main className="text-black bg-white relative min-h-[100dvh] w-full flex items-center justify-center text-center">
       <div className="bg-white border-3 border-gray-200 rounded-xl relative z-10 w-[90%] max-w-xl p-10">
        <h1 className="text-5xl font-extrabold tracking-tight mb-6">
          Reset Password
        </h1>

        <div className="flex flex-col gap-5">
          <p className="text-base">
            Enter your email address to receive a password reset link
          </p>

          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white border-3 border-gray-200 w-full rounded-xl px-6 py-3 text-black placeholder-gray-400 outline-none transition"
          />

          {message && (
            <p className="text-xs md:text-base w-full rounded-full bg-white text-red-400 font-semibold py-3 transition">
              {message}
            </p>
          )}

          <button
            onClick={handleReset}
            disabled={loading}
            className="text-lg font-bold bg-black text-white hover:scale-105 cursor-pointer transition w-full py-3 rounded-xl"
          >
            {loading ? "Sending..." : "Send Reset Email"}
          </button>

          
        </div>

  <div className="mt-6 text-center">
        <button
            onClick={() => router.push("/signin")}
            className="text-black hover:underline text-md cursor-pointer"
          >
            Back to Sign In
          </button></div>

      </div>
    </main>
  );
}
