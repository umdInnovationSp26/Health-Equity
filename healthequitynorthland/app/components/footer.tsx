"use client";

import { usePathname } from "next/navigation";
import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaYoutube,
  FaLinkedinIn,
} from "react-icons/fa";

export default function Footer() {
  const pathname = usePathname() || "";

  const hiddenRoutes = [""];
  if (hiddenRoutes.includes(pathname)) return null;

  return (
    <footer className="bg-[var(--colorAccent)] text-black mt-20">
      <div className="max-w-7xl mx-auto px-10 py-12 grid md:grid-cols-2 gap-20">
        {/* LEFT SIDE */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold">Health Equity Northland</h3>

          <p className="text-sm leading-relaxed">
            312 North Central Avenue, Suite 400, Duluth, MN 55807
          </p>

          <div className="text-sm space-y-1">
            <p>
              <span className="font-semibold">Email:</span>{" "}
              <a
                href="mailto:healthequitynorthland@gmail.com"
                className="underline underline-offset-2 hover:opacity-70"
              >
                healthequitynorthland@gmail.com
              </a>
            </p>

            <p>
              <span className="font-semibold">Phone:</span> 218.461.8039
            </p>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-4 pt-2">
            <a
              href="https://www.facebook.com/healthequitynorthland"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition hover:-translate-y-0.5"
            >
              <FaFacebookF size={18} />
            </a>
            <a
              href="https://www.instagram.com/healthequitynorthland/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition hover:-translate-y-0.5"
            >
              <FaInstagram size={18} />
            </a>
            <a
              href="https://x.com/healthealliance"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition hover:-translate-y-0.5"
            >
              <FaTwitter size={18} />
            </a>
            <a
              href="https://www.youtube.com/@healthequitynorthland8906"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition hover:-translate-y-0.5"
            >
              <FaYoutube size={18} />
            </a>
            <a
              href="https://www.linkedin.com/company/health-equity-northland"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition hover:-translate-y-0.5"
            >
              <FaLinkedinIn size={18} />
            </a>
          </div>

          <p className="text-sm pt-4">
            Health Equity Northland / dba Healthy Alliances Matter for All
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold">About</h3>

          <ul className="space-y-3 text-sm">
            <li>
              <a
                href="/privacy"
                className="underline underline-offset-2 hover:opacity-70"
              >
                Our Goals
              </a>
            </li>
            <li>
              <a
                href="https://www.paypal.com/donate/?hosted_button_id=G4B4KX8ZR2BUE"
                className="underline underline-offset-2 hover:opacity-70"
              >
                Donate
              </a>
            </li>
            <li>
              <a
                href="https://venmo.com/u/healthequitynorthland"
                className="underline underline-offset-2 hover:opacity-70"
              >
                Venmo: @Healthequitynorthland
              </a>
            </li>
            <li>
              <a
                href="https://www.paypal.com/signin?returnUri=https%3A%2F%2Fwww.paypal.com%2Fpaypalme&state=%2Fmy%2Flanding"
                className="underline underline-offset-2 hover:opacity-70"
              >
                PayPal: @Healthyalliances
              </a>
            </li>
            <li className="pt-2 font-semibold italic">
              Your contribution is Tax deductible
            </li>
          </ul>
        </div>
      </div>

      {/* DISCLAIMER */}
      <div className="max-w-7xl mx-auto px-10 pb-10">
        <p className="text-sm leading-relaxed italic opacity-80">
          The information provided on this website is for educational purposes
          only, and does not substitute for professional medical advice. Consult
          a medical professional or healthcare provider if you&apos;re seeking
          medical advice, diagnoses, or treatment. Follow CDC or World Health
          Organization guidelines for current Covid-19 information.
        </p>
      </div>
    </footer>
  );
}
