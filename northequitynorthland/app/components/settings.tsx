/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { auth, db } from "@/app/lib/firebaseClient";
import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import Card from "@/app/components/card";

type Profile = {
  id: string;
  displayName: string;
  title?: string;
  avatar?: string;
  email?: string;
  emailVerified?: boolean;
  createdAt?: Date;
};

export default function Settings() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile>({
    id: "",
    displayName: "",
  });
  const [originalProfile, setOriginalProfile] = useState<Profile | null>(null);
  const [, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const router = useRouter();
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  /** Listen for Auth + Firestore updates */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/signin");
        return;
      }

      setUser(currentUser);
      const userRef = doc(db, "users", currentUser.uid);

      const unsubDoc = onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        const newProfile: Profile = {
          id: currentUser.uid,
          displayName: data.displayName ?? "",
          email: data.email,
          emailVerified: currentUser.emailVerified,
          title: data.title,
          avatar: data.avatar,
        };

        setProfile(newProfile);
        setOriginalProfile(newProfile);
      });

      return () => unsubDoc();
    });

    return () => unsubAuth();
  }, [router]);

  /** Sign out */
  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/signin");
  };

  /** Auto-save with debounce */
  const autoSave = useCallback(
    (updated: Profile) => {
      if (!user) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);

      saveTimeout.current = setTimeout(async () => {
        setSaving(true);
        try {
          const updates: Record<string, any> = {};
          for (const key of Object.keys(updated) as (keyof Profile)[]) {
            if (
              JSON.stringify(updated[key]) !==
              JSON.stringify(originalProfile?.[key])
            ) {
              updates[key] = updated[key];
            }
          }

          if (!updated.createdAt) updates.createdAt = Timestamp.now();

          if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, "users", user.uid), updates);
            setOriginalProfile(updated);
          }
        } catch (e) {
          console.error("Auto-save error:", e);
        } finally {
          setSaving(false);
        }
      }, 500);
    },
    [user, originalProfile]
  );

  const handleChange = (key: keyof Profile, value: any) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    autoSave(updated);
  };

  /** Delete Account */
  const handleDeleteAccount = useCallback(async () => {
    if (!user) return alert("No user is logged in.");

    try {
      const uid = user.uid;

      // Delete subcollection ("filter")
      const filterColRef = collection(db, "users", uid, "filter");
      const filterSnapshot = await getDocs(filterColRef);
      await Promise.all(filterSnapshot.docs.map((d) => deleteDoc(d.ref)));

      // Delete user doc + auth
      await deleteDoc(doc(db, "users", uid));
      await user.delete();
      router.push("/");
      await signOut(auth);
    } catch (error: any) {
      console.error("Failed to delete account:", error);
      alert("Failed to delete account: " + error.message);
    }
  }, [router, user]);

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6 overflow-y-auto max-h-[calc(100vh-65px)]">
      <EditableField
        label="Name"
        value={profile.displayName}
        onChange={(v) => handleChange("displayName", v)}
      />

      <Card title="Email" value={profile.email || "Email"} change="" />

      <Card
        title="Email Verified"
        value={profile.emailVerified ? "Verified" : "N/A"}
        change=""
      />

      {/* Sign Out + Delete */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mt-8">
        <button
          onClick={handleSignOut}
          className="text-base cursor-pointer hover:scale-105 bg-white text-black px-6 py-3 transition border border-gray-200"
        >
          Sign Out
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="text-base cursor-pointer hover:scale-105 bg-white text-black px-6 py-3 transition border border-gray-200"
        >
          Delete Account
        </button>
      </div>

      {showDeleteModal && (
        <DeleteModal
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </main>
  );
}

/** EditableField */
function EditableField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 p-3">
      <h3 className="text-base">{label}</h3>
      <input
        type="text"
        placeholder={`Enter your ${label.toLowerCase()}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-200 p-2 mt-2 text-base font-bold focus:outline-none transition"
      />
    </div>
  );
}

/** DeleteModal */
function DeleteModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-black text-white p-6 w-full max-w-lg space-y-4">
        <h2 className="text-2xl font-bold">Delete Account?</h2>
        <p className="text-lg">All your account data will be deleted.</p>
        <p className="text-lg">Subscriptions will be deactivated.</p>
        <div className="flex justify-end gap-4 pt-4">
          <button
            onClick={onCancel}
            className="text-xl cursor-pointer hover:scale-105 bg-white text-black px-6 py-3 text-sm transition border border-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="text-xl cursor-pointer hover:scale-105 bg-white text-black px-6 py-3 text-sm transition border border-gray-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
