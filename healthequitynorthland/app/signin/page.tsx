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
import Button from "@/app/components/button";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const googleProvider = new GoogleAuthProvider();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.push("/signin/verify");
    });
    return () => unsubscribe();
  }, [router]);

  const handleEmailSignIn = async () => {
    if (!email || !password)
      return setError("Please enter email and password.");
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
    setError(null);
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
    <>
      {/* <Navbar /> */}

      <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        {/* Outer card with blue border */}
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl flex flex-col sm:flex-row overflow-hidden">
          {/* ── Left panel: form ── */}
          <div className="flex-1 p-10 flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Sign In
            </h2>

            <div className="flex flex-col gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </span>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    disabled={loading}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400 transition disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full pl-9 pr-14 py-2.5 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400 transition disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <p className="text-xs text-red-500 font-medium -mt-1">
                  {error}
                </p>
              )}

              {/* Sign In button */}
              <Button
                variant="primary"
                onClick={handleEmailSignIn}
                disabled={loading}
                className="mt-1 w-full"
              >
                {loading ? "Signing in…" : "Sign In"}
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3 text-gray-400 text-xs">
                <span className="flex-1 h-px bg-gray-200" />
                or
                <span className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Google Sign In */}
              <Button
                variant="primary"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full"
              >
                <svg
                  className="w-4 h-4"
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
                {loading ? "Please wait…" : "Sign In with Google"}
              </Button>

              {/* Footer links */}
              <p className="text-center text-xs text-gray-500 mt-1">
                <Link
                  href="/signin/resetpassword"
                  className="hover:underline text-gray-600"
                >
                  Forgot Password?
                </Link>
                <span className="mx-2 text-gray-300">|</span>
                <Link href="/signup" className="hover:underline text-gray-600">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>

          {/* ── Right panel: logo ── */}
          <div className="hidden sm:flex flex-1 items-center justify-center bg-white border-l border-gray-100 p-10">
            {/*
              Update src to your actual logo path, e.g. "/images/logo.png"
            */}
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
