"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname() || "";

  const hiddenRoutes = [""];
  if (hiddenRoutes.includes(pathname)) return null;

  return (
    <footer className="bg-[var(--colorAccent)] text-black">
      {/* Grid Sections */}
      <div className="py-8 max-w-3xl mx-auto px-2 grid grid-cols-2 md:grid-cols-2 gap-10">
        {/* Product */}
        <div className="">
          <h3 className="text-2xl font-semibold mb-3">
            Health Equity Northland
          </h3>
          <ul className="space-y-2">
            <li>
              <a className="">
                312 North Central Avenue, Suite 400, Duluth, MN 55807
              </a>
            </li>
            <li>
              <a className="">
                <span className="font-bold"> Email: </span>
                healthequitynorthland@gmail.com
              </a>
            </li>
            <li>
              <a className="">
                <span className="font-bold">Phone:</span> 218.461.8039
              </a>
            </li>
            <li>
              <a className="">
                Health Equity Northland / dba Healthy Alliances Matter for All
              </a>
            </li>
            <li>
              <a className="">
                The information provided on this website is for educational
                purposes only, and does not substitute for professional medical
                advice. Consult a medical professional or healthcare provider if
                you&apos;re seeking medical advice, diagnoses, or treatment.
                Follow CDC or World Health Organization guidelines for current
                Covid-19 information.
              </a>
            </li>
          </ul>
        </div>

        {/* Aout */}
        <div className="">
          <h3 className="font-semibold mb-3">About</h3>
          <ul className="space-y-2">
            <li>
              <a href="/privacy" className="hover:underline">
                Our Goals
              </a>
            </li>
            <li>
              <a
                href="https://www.paypal.com/donate/?hosted_button_id=G4B4KX8ZR2BUE"
                className="hover:underline"
              >
                Donate
              </a>
            </li>
            <li>
              <a
                href="https://venmo.com/u/healthequitynorthland"
                className="hover:underline"
              >
                Venmo: @Healthequitynorthland
              </a>
            </li>
            <li>
              <a
                href="https://www.paypal.com/signin?returnUri=https%3A%2F%2Fwww.paypal.com%2Fpaypalme&state=%2Fmy%2Flanding"
                className="hover:underline"
              >
                PayPal: @Healthyalliances
              </a>
            </li>
            <li>
              <a href="/terms" className="font-bold hover:underline">
                Your contribution is Tax deductible
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="py-6 text-center text-sm">
        Health Equity Northland © {new Date().getFullYear()}. All rights
        reserved.
      </div>
    </footer>
  );
}
