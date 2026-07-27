"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/app/lib/firebaseClient";
import { collection, getDocs, addDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import Button from "@/app/components/button";
import { FaArrowLeft, FaTrash } from "react-icons/fa";
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

  /* Delete contact state */
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  /* Delete contact */
  const handleDeleteContact = async () => {
    if (!contactToDelete) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "contacts", contactToDelete.id));
      // Remove from local state so the list updates without a reload.
      setContacts((prev) => prev.filter((c) => c.id !== contactToDelete.id));
      setContactToDelete(null);
    } catch (err) {
      console.error("Failed to delete contact", err);
      window.alert("Something went wrong deleting this contact. Please try again.");
    } finally {
      setDeleting(false);
    }
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
            <Button onClick={() => setShowAdd(true)}>
              + Add
            </Button>
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
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 shadow-sm bg-white p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                    <p className="text-sm text-slate-500 truncate">{c.email}</p>
                    {c.phone && (
                      <p className="text-xs text-slate-400 truncate">{c.phone}</p>
                    )}
                  </div>

                  <button
                    onClick={() => setContactToDelete(c)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500 active:bg-red-100 hover:cursor-pointer"
                    aria-label={`Delete ${c.name}`}
                  >
                    <FaTrash size={14} />
                  </button>
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
              <Button variant="secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>

              <Button onClick={handleAddContact} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONTACT CONFIRMATION */}
      {contactToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Delete contact?</h2>
            <p className="text-sm text-slate-600">
              This will permanently delete{" "}
              <span className="font-semibold text-slate-900">
                {contactToDelete.name}
              </span>
              . This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setContactToDelete(null)} disabled={deleting}>
                Cancel
              </Button>

              <Button variant="danger" onClick={handleDeleteContact} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
