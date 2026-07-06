"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SetNewInventoryLevels() {
  const router = useRouter();
  const isExitingRef = useRef(false);

 const handleManualExit = () => {
  window.removeEventListener("popstate", handlePopStateExit);
   window.history.go(-1);
};
  
  const handlePopStateExit = () => {
  if (isExitingRef.current) return;

  window.history.go(-1);
};

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopStateExit);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopStateExit);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <button
        type="button"
        onClick={handleManualExit}
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