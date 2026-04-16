"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/app/lib/firebaseClient";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import { FaArrowLeft } from "react-icons/fa";
import router from "next/router";

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

  /* Add contact */
  const handleAddContact = async () => {
    if (!newName || !newEmail) return;

    setSaving(true);

    await addDoc(collection(db, "contacts"), {
      name: newName,
      email: newEmail,
      phone: newPhone,
      createdAt: Timestamp.now(),
    });

    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setShowAdd(false);
    setSaving(false);
  };

  /* Filter + sort */
  const filtered = useMemo(() => {
    return contacts
      .filter((c) => {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a[sortKey].localeCompare(b[sortKey]));
  }, [contacts, search, sortKey]);

  return (
    <>
      <Navbar />

      <main className="pt-20 min-h-screen">
        {/* Top bar with search */}
        <div className="bg-white shadow-sm flex items-center justify-between p-4 gap-2 relative">
          <div className="content-start px-4"></div>

          <h3 className="text-black absolute left-1/2 -translate-x-1/2 font-bold">
            Contacts
          </h3>

          <div className="content-end text-right pr-4">
            <button
              onClick={() => setShowAdd(true)}
              className="bg-blue-600 rounded-xl px-3 sm:px-4 py-2 hover:cursor-pointer hover:scale-105 transition text-sm sm:text-base text-white"
            >
              + Add
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-2xl space-y-5 p-6">
          {/* Search + sort */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="name">Sort by name</option>
              <option value="email">Sort by email</option>
            </select>
          </div>

          {/* List */}
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-400">No contacts found.</p>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-gray-100 shadow-sm bg-white p-4"
                >
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <p className="text-sm text-slate-500">{c.email}</p>
                  {c.phone && (
                    <p className="text-xs text-slate-400">{c.phone}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* ADD CONTACT MODAL */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-3">
            <h2 className="text-lg font-bold">Add Contact</h2>

            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />

            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />

            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-2 hover:cursor-pointer hover:scale-105 text-xs rounded-lg border"
              >
                Cancel
              </button>

              <button
                onClick={handleAddContact}
                disabled={saving}
                className="px-3 py-2 hover:cursor-pointer hover:scale-105 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
