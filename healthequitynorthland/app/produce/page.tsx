"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/app/lib/firebaseClient";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";

type Contact = {
  id: string;
  name: string;
  email: string;
  phone?: string;
};

type SortKey = "name" | "email";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [loading, setLoading] = useState(true);

  /* Add contact state */
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);

  /* Load contacts */
  useEffect(() => {
    const loadContacts = async () => {
      setLoading(true);

      const snap = await getDocs(collection(db, "contacts"));

      const data: Contact[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name || "Unnamed",
          email: d.email || "",
          phone: d.phone || "",
        };
      });

      setContacts(data);
      setLoading(false);
    };

    loadContacts();
  }, []);

  return (
    <>
      <Navbar />

      <main className="pt-20 min-h-screen">
        {/* Top bar with search */}
        <div className="bg-white shadow-sm flex items-center justify-between p-4 gap-2 relative">
          <div className="content-start px-4"></div>

          <h3 className="text-black absolute left-1/2 -translate-x-1/2 font-bold">
            Produce
          </h3>

          <div className="content-end text-right pr-4">
            <button
              onClick={() => setShowAdd(true)}
              className="bg-blue-600 rounded-xl px-3 sm:px-4 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base text-white"
            >
              ...
            </button>
          </div>
        </div>

        {/* Search + sort */}
         <div className="mx-auto max-w-2xl space-y-5 p-6">
          {/* Search + sort */}
          <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="name">Sort by lbs</option>
          </select>
        </div></div>
      </main>

      <Footer />
    </>
  );
}
