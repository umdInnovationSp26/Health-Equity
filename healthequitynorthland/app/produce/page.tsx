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

      <main className="pt-30 min-h-screen px-4 py-10">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Produce</h1>
          </div>

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
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
