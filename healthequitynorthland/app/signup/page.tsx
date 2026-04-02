"use client";

import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "@/app/lib/firebaseClient";
import { createOrUpdateUserDoc } from "@/app/lib/authUtils";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/navbar";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const googleProvider = new GoogleAuthProvider();

  // Auto-redirect if already signed in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.push("/signin/verify");
    });
    return () => unsub();
  }, [router]);

  const handleEmailSignUp = async () => {
    if (!email || !password || !confirmPassword)
      return setError("Please fill out all fields.");

    if (password !== confirmPassword)
      return setError("Passwords do not match.");

    setLoading(true);
    setError(null);
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await createOrUpdateUserDoc(user);
      router.push("/signin/verify");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      await createOrUpdateUserDoc(user);
      router.push("/signin/verify");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="text-black bg-white relative min-h-[100dvh] w-full flex items-center justify-center text-center">
      <Navbar />
      <div className="bg-white border-3 border-gray-200 rounded-xl relative z-10 w-[90%] max-w-xl p-10">
        <h1 className="text-6xl md:text-8xl font-extrabold mb-6 md:mb-12 tracking-tight">
          Sign Up
        </h1>

        <div className="flex flex-col gap-5">
          <input
            type="email"
            placeholder="Email"
            value={email}
            disabled={loading}
            onChange={(e) => setEmail(e.target.value.trim())}
            className="bg-white border-3 border-gray-200 w-full rounded-xl px-6 py-3 text-black placeholder-gray-400 outline-none transition"
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              disabled={loading}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white border-3 border-gray-200 w-full rounded-xl px-6 py-3 text-black placeholder-gray-400 outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-black font-bold cursor-pointer"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              disabled={loading}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-white border-3 border-gray-200 w-full rounded-xl px-6 py-3 text-black placeholder-gray-400 outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-black font-bold cursor-pointer"
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p className="text-xs md:text-base w-full rounded-full bg-white text-red-400 font-semibold py-3 transition">
              {error}
            </p>
          )}

          <button
            onClick={handleEmailSignUp}
            disabled={loading}
            className="text-lg font-bold bg-black text-white hover:scale-105 cursor-pointer transition w-full py-3 rounded-xl active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="text-lg font-bold bg-black text-white hover:scale-105 cursor-pointer transition w-full py-3 rounded-xl active:scale-95 flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 18 19"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.842 18.083a8.8 8.8 0 0 1-8.65-8.948 8.841 8.841 0 0 1 8.8-8.652h.153a8.464 8.464 0 0 1 5.7 2.257l-2.193 2.038A5.27 5.27 0 0 0 9.09 3.4a5.882 5.882 0 0 0-.2 11.76h.124a5.091 5.091 0 0 0 5.248-4.057L14.3 11H9V8h8.34c.066.543.095 1.09.088 1.636-.086 5.053-3.463 8.449-8.4 8.449l-.186-.002Z"
                clipRule="evenodd"
              />
            </svg>
            {loading ? "Please wait..." : "Sign Up with Google"}
          </button>
        </div>

        <div className="mt-6 text-center text-md">
          <Link
            href="/signin"
            className="text-black hover:underline cursor-pointer"
          >
             Already have an account? | Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
