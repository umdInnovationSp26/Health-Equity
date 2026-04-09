"use client";

import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "@/app/lib/firebaseClient";
import { createOrUpdateUserDoc } from "@/app/lib/authUtils";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/navbar";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const googleProvider = new GoogleAuthProvider();

  // Redirect if user is already signed in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/signin/verify");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleEmailSignIn = async () => {
    if (!email || !password) return setError("Please enter email and password");
    setLoading(true);
    setError(null);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await createOrUpdateUserDoc(user);
      router.push("/signin/verify");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
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
       
      <div className="bg-white border-3 border-gray-200 rounded-xl relative z-10 w-[90%] max-w-xl p-10">
        <h1 className="text-black text-6xl md:text-8xl font-bold mb-6 md:mb-12">
          Sign In
        </h1>

        <div className="flex flex-col gap-5">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            disabled={loading}
            className="bg-white border-3 border-gray-200 w-full rounded-xl px-6 py-3 text-black placeholder-gray-400 outline-none transition"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="bg-white border-3 border-gray-200 w-full rounded-xl px-6 py-3 text-black placeholder-gray-400 outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-black font-bold "
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p className="text-xs md:text-base w-full rounded-full bg-white text-red-400 font-semibold py-3 transition">
              {error}
            </p>
          )}

          <button
            onClick={handleEmailSignIn}
            disabled={loading}
            className="text-lg font-bold bg-black text-white hover:scale-105 cursor-pointer transition w-full py-3 rounded-xl"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <button
            onClick={handleGoogleSignIn}
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
            {loading ? "Please wait..." : "Sign In with Google"}
          </button>
        </div>

        <div className="mt-6 text-center text-md">
          <Link
            href="/signin/resetpassword"
            className="text-black hover:underline cursor-pointer"
          >
            Forgot password?
          </Link>
          <span className="mx-2">|</span>
          <Link
            href="/signup"
            className="text-black hover:underline cursor-pointer"
          >
            Sign Up
          </Link>
        </div>
        
      </div>
    </main>
  );
}
