"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname() || "";

  const hiddenRoutes = [""];
  if (hiddenRoutes.includes(pathname)) return null;

  return (
    <footer className="bg-gray-200 text-black">
      {/* Grid Sections */}
      <div className="py-8 max-w-3xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        {/* Product */}
        <div className="">
          <h3 className="font-semibold mb-3">Product</h3>
          <ul className="space-y-2">
            <li>
              <a href="/investing" className="hover:underline">
                Investing
              </a>
            </li>
            <li>
              <a href="/credit" className="hover:underline">
                Credit Card
              </a>
            </li>
            <li>
              <a href="/college" className="hover:underline">
                College
              </a>
            </li>
          </ul>
        </div>

        {/* Company */}
        <div className="">
          <h3 className="font-semibold mb-3">Company</h3>
          <ul className="space-y-2">
            <li>
              <a href="/about" className="hover:underline">
                About
              </a>
            </li>
            <li>
              <a href="/careers" className="hover:underline">
                Careers
              </a>
            </li>
                        <li>
              <a href="/support" className="hover:underline">
                Support
              </a>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div className="">
          <h3 className="font-semibold mb-3">Legal</h3>
          <ul className="space-y-2">
            <li>
              <a href="/privacy" className="hover:underline">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="/terms" className="hover:underline">
                Terms & Conditions
              </a>
            </li>
          </ul>
        </div>

        {/* Social */}
        <div className="">
          <h3 className="font-semibold mb-3">Social</h3>
          <ul className="space-y-2">
            <li>
              <a
                href="https://x.com/healthealliance"
                target="_blank"
                className="hover:underline"
              >
                Twitter
              </a>
            </li>
            <li>
              <a
                href="https://instagram.com/healthequitynorthland"
                target="_blank"
                className="hover:underline"
              >
                Instagram
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="py-6 text-center text-sm">
        Health Equity Northland © {new Date().getFullYear()}. All rights reserved.
      </div>
    </footer>
  );
}
