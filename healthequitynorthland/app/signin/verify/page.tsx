"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/app/lib/firebaseClient";

// Email verification is temporarily disabled.
// Any signed-in user is sent straight to "/".
export default function VerifyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/signin");
        return;
      }

      setUser(u);
      router.push("/");
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        {user ? "Redirecting…" : "Loading…"}
      </div>
    </div>
  );
}
