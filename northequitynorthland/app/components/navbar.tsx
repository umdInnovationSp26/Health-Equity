"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

// --- Types
type FinanceProfile = {
  id: string;
  displayName: string;
  avatar?: string;
};

export default function Navbar() {
  const pathname = usePathname() || "";
  const [profile] = useState<FinanceProfile>({
    id: "",
    displayName: "",
  });

  // Bold on active tab
  const linkClass = (path: string) =>
    `tracking-tight ${pathname === path ? "font-bold" : "font-normal"}`;

  // Hide navbar on scroll
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;

      // hide when scrolling down
      if (currentScroll > lastScrollY && currentScroll > 60) {
        setHidden(true);
      } else {
        setHidden(false);
      }

      setLastScrollY(currentScroll);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Routes where SIGN IN should be hidden
  const hideSignInOn = ["/dashboard"];
  const hideSignIn = hideSignInOn.includes(pathname);

  const showProfileIn = ["/dashboard"];
  const showProfile = showProfileIn.includes(pathname);

  return (
    <header
      className={`bg-white fixed top-0 left-0 w-full z-50 transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex items-center justify-between h-15 border-b-3 border-gray-200 px-6 md:px-16">
        <div className="flex items-center gap-8">
          <Link href="/" className={linkClass("/")}>
            Home
          </Link>

          <Link href="/calendar" className={linkClass("/calendar")}>
            Calendar
          </Link>

          <Link href="/events" className={linkClass("/events")}>
            Events
          </Link>

          <Link href="/resources" className={linkClass("/resources")}>
            Resources
          </Link>

          <Link href="/profile" className={linkClass("/profile")}>
            Profile
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {/* Profile (Dashboard) */}
          {showProfile && (
            <Link
              href="/signin"
              className="hidden text-xs md:text-base flex items-center gap-2 text-[var(--lightGray)] border-[3px] border-[var(--lightGray)] font-semibold hover:scale-105 transition px-5 py-2 rounded-full"
            >
              <span>{profile.displayName || "Dashboard"}</span>
            </Link>
          )}

          {/* Sign In / Sign Up */}
          {!hideSignIn && (
            <div className="flex gap-4">
              <Link
                href="/settings"
                className="tracking-tight flex items-center transition hover:scale-110"
              >
                <Image
                  src="/SettingsIcon.png"
                  alt="Settings Icon"
                  width={24}
                  height={24}
                />
              </Link>

              <Link
                href="/profile"
                className="hidden md:flex items-center justify-center px-4 py-4 rounded-full border-2 border-white/10 bg-black text-white transition hover:scale-105"
              >
                <span></span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
