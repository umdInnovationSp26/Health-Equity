"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/app/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

type Profile = {
  displayName: string;
  avatar?: string;
};

export default function Navbar() {
  const pathname = usePathname() || "";
  const [profile, setProfile] = useState<Profile>({
    displayName: "",
    avatar: "",
  });
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide navbar on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setHidden(currentScroll > lastScrollY && currentScroll > 60);
      setLastScrollY(currentScroll);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Load profile from Firebase
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const unsubDoc = onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setProfile({
          displayName: data.displayName || data.firstName || "User",
          avatar: data.avatar || "",
        });
      });

      return () => unsubDoc();
    });

    return () => unsubAuth();
  }, []);

  return (
    <header
      className={`bg-white shadow-md fixed top-0 left-0 w-full z-50 transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex items-center justify-between h-20 px-6 md:px-16">
        {/* Logo */}
        <Link href="/">
          <Image
            src="/navbar.webp"
            alt="Navbar"
            width={116}
            height={116}
            className="cursor-pointer"
          />
        </Link>

        {/* Navigation */}
        <div className="text-black flex items-center gap-8 text-base">
          <Link
            href="/"
            className={pathname === "/" ? "font-bold" : "font-normal"}
          >
            Home
          </Link>
          <Link
            href="/events"
            className={pathname === "/events" ? "font-bold" : "font-normal"}
          >
            Events
          </Link>
          <Link
            href="/produce"
            className={pathname === "/produce" ? "font-bold" : "font-normal"}
          >
            Produce
          </Link>
          <Link
            href="/contacts"
            className={pathname === "/contacts" ? "font-bold" : "font-normal"}
          >
            Contacts
          </Link>
        </div>

        {/* Profile avatar only, fixed circle size */}
        <div className="flex items-center">
          <Link
            href="/profile"
            className="block w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200"
          >
            <Image
              src={profile.avatar || "/HEN.webp"} // fallback if no avatar
              alt="Profile"
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
