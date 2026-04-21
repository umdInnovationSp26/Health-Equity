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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const pages = [
    { name: "Home", href: "/" },
    { name: "Events", href: "/events" },
    { name: "Produce", href: "/produce" },
    { name: "Contacts", href: "/contacts" },
  ];

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

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8 text-base text-black">
          {pages.map((page) => {
          
            const isActive = page.href === "/" 
                ? pathname === "/" 
                : pathname.startsWith(page.href);

            return (
              <Link
                key={page.href}
                href={page.href}
                className={isActive ? "font-bold" : "font-normal"}
              >
                {page.name}
              </Link>
            );
          })}
        </div>

        {/* Profile + Mobile Burger */}
        <div className="flex items-center relative">
          <Link
            href="/profile"
            className="hidden md:block w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200"
          >
            <Image
              src={profile.avatar || "/HEN.webp"} // fallback if no avatar
              alt="Profile"
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          </Link>

          {/* Mobile burger menu */}
          <button
            className="md:hidden ml-2 flex flex-col justify-between w-6 h-6"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span
              className={`block h-0.5 w-full bg-black transition-transform duration-300 ${
                mobileMenuOpen ? "rotate-45 translate-y-2.5" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-full bg-black transition-opacity duration-300 ${
                mobileMenuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`block h-0.5 w-full bg-black transition-transform duration-300 ${
                mobileMenuOpen ? "-rotate-45 -translate-y-3" : ""
              }`}
            />
          </button>

          {/* Mobile dropdown */}
          {mobileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-40 bg-white shadow-lg rounded-lg border border-gray-200 flex flex-col z-50">
              {pages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 hover:bg-gray-100 ${
                    pathname === page.href ? "font-bold" : "font-normal"
                  }`}
                >
                  {page.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}