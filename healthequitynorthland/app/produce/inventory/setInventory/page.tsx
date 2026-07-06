"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaAngleDown } from "react-icons/fa";
export default function SetNewInventoryLevels() {
  const router = useRouter();
  const isExitingRef = useRef(false);

 const handleManualExit = () => {
  router.back();
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
                          onClick={() => handleManualExit()}
                          className="p-2 hover:scale-105 transition hover:cursor-pointer"
                        >
                          <FaArrowLeft />
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