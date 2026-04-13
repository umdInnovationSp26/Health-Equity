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

      <main className="pt-30 min-h-screen px-4 py-10">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Contacts</h1>

            <button
              onClick={() => setShowAdd(true)}
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              + Add
            </button>
          </div>

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
                  className="rounded-xl border border-slate-100 bg-white p-4"
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
                className="px-3 py-2 text-xs rounded-lg border"
              >
                Cancel
              </button>

              <button
                onClick={handleAddContact}
                disabled={saving}
                className="px-3 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
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
