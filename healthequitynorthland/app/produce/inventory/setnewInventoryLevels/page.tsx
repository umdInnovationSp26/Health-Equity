"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SetNewInventoryLevels() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  const handleExit = () => {
    if (isExiting) {
      return true;
    }

    setIsExiting(true);
    const shouldLeave = window.confirm("Are you sure you want to exit this page? Any unsaved changes will be lost.");
    setIsExiting(false);

    if (shouldLeave) {
      router.back();
      return true;
    }

    return false;
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = () => {
      if (!handleExit()) {
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <button
        type="button"
        onClick={() => handleExit()}
        disabled={isExiting}
        aria-label="Exit page"
        className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ×
      </button>

      <div className="mx-auto max-w-4xl pt-12">
        <h1 className="text-2xl font-semibold text-slate-900">Set New Inventory Levels</h1>
        <p className="mt-2 text-sm text-slate-600">
          Adjust inventory levels for your produce here.
        </p>
      </div>
    </div>
  );
}
