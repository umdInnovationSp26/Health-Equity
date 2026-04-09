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

/* ─── Types ─────────────────────────────────────────────── */
type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  birthday: string;
  country: string;
  cityState: string;
  street: string;
  zip: string;
  avatar: string;
  emailVerified: boolean;
  darkMode: boolean;
  emailNotifications: boolean;
  createdAt?: Date;
};

const DEFAULT_PROFILE: Profile = {
  id: "",
  firstName: "",
  lastName: "",
  title: "",
  email: "",
  phone: "",
  birthday: "",
  country: "",
  cityState: "",
  street: "",
  zip: "",
  avatar: "",
  emailVerified: false,
  darkMode: false,
  emailNotifications: false,
};

/* ─── Helpers ────────────────────────────────────────────── */
function initials(first: string, last: string) {
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || "?";
}

function formatBirthday(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/* ─── Sub-components ─────────────────────────────────────── */

/** Editable field: shows value in read mode, input in edit mode */
function Field({
  label,
  value,
  inputType = "text",
  editing,
  onChange,
  fullWidth = false,
}: {
  label: string;
  value: string;
  inputType?: string;
  editing: boolean;
  onChange: (v: string) => void;
  fullWidth?: boolean;
}) {
  const displayValue =
    inputType === "date" && value ? formatBirthday(value) : value || "—";

  return (
    <div className={`flex flex-col gap-0.5 ${fullWidth ? "col-span-2" : ""}`}>
      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
        {label}
      </span>
      {editing ? (
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
        />
      ) : (
        <span className="text-sm font-medium text-gray-900">{displayValue}</span>
      )}
    </div>
  );
}

/** Toggle switch */
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
        checked ? "bg-blue-500" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        } mt-[1px]`}
      />
    </button>
  );
}

/** Delete confirmation modal */
function DeleteModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Delete account?</h2>
        <p className="mb-5 text-sm text-gray-500">
          All your account data will be permanently deleted. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/** Toast notification */
function Toast({ visible }: { visible: boolean }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      Changes saved
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function Profile() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [originalProfile, setOriginalProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  /* Auth + Firestore listener */
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

        const loaded: Profile = {
          id: currentUser.uid,
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          title: data.title ?? "",
          email: data.email ?? currentUser.email ?? "",
          phone: data.phone ?? "",
          birthday: data.birthday ?? "",
          country: data.country ?? "",
          cityState: data.cityState ?? "",
          street: data.street ?? "",
          zip: data.zip ?? "",
          avatar: data.avatar ?? "",
          emailVerified: currentUser.emailVerified,
          darkMode: data.darkMode ?? false,
          emailNotifications: data.emailNotifications ?? false,
          createdAt: data.createdAt?.toDate(),
        };

        setProfile(loaded);
        setOriginalProfile(loaded);
        if (loaded.avatar) setAvatarPreview(loaded.avatar);
      });

      return () => unsubDoc();
    });

    return () => unsubAuth();
  }, [router]);

  /* Debounced auto-save */
  const autoSave = useCallback(
    (updated: Profile) => {
      if (!user) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);

      saveTimeout.current = setTimeout(async () => {
        setSaving(true);
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updates: Record<string, any> = {};
          (Object.keys(updated) as (keyof Profile)[]).forEach((key) => {
            if (JSON.stringify(updated[key]) !== JSON.stringify(originalProfile[key])) {
              updates[key] = updated[key];
            }
          });
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
      }, 600);
    },
    [user, originalProfile]
  );

  const handleChange = useCallback(
    (key: keyof Profile, value: string | boolean) => {
      setProfile((prev) => {
        const updated = { ...prev, [key]: value };
        autoSave(updated);
        return updated;
      });
    },
    [autoSave]
  );

  /* Toggle edit mode */
  const handleEditToggle = () => {
    if (editing) {
      // Save and exit
      autoSave(profile);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
    setEditing((e) => !e);
  };

  /* Cancel edit — revert changes */
  const handleCancel = () => {
    setProfile(originalProfile);
    setEditing(false);
  };

  /* Avatar upload */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAvatarPreview(result);
      handleChange("avatar", result);
    };
    reader.readAsDataURL(file);
  };

  /* Sign out */
  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/signin");
  };

  /* Delete account */
  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;
    try {
      const uid = user.uid;
      const filterColRef = collection(db, "users", uid, "filter");
      const filterSnapshot = await getDocs(filterColRef);
      await Promise.all(filterSnapshot.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "users", uid));
      await user.delete();
      await signOut(auth);
      router.push("/");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      alert("Failed to delete account: " + msg);
    }
  }, [user, router]);

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || "Your Name";
  const location = [profile.cityState, profile.country].filter(Boolean).join(", ");

  return (
    <main className="pt-25 min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* ── Profile Header Card ── */}
        <div className="relative flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="h-14 w-14 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700">
                {initials(profile.firstName, profile.lastName)}
              </div>
            )}
            {editing && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="hover:cursor-pointer absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50 transition"
                title="Change photo"
              >
                <PencilIcon size={10} />
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-gray-900 truncate">{fullName}</p>
            {profile.title && (
              <p className="text-sm text-gray-500 truncate">{profile.title}</p>
            )}
            {location && (
              <p className="text-xs text-gray-400 truncate">{location}</p>
            )}
          </div>

          {/* Edit / Done button */}
          <button
            onClick={handleEditToggle}
            className="hover:cursor-pointer flex items-center gap-1.5 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 active:scale-95"
          >
            <PencilIcon size={12} color="white" />
            {editing ? "Done" : "Edit"}
          </button>
        </div>

        {/* Cancel bar (only in edit mode) */}
        {editing && (
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
            <span className="text-xs text-amber-700 font-medium">
              {saving ? "Saving…" : "Editing profile — changes auto-save"}
            </span>
            <button
              onClick={handleCancel}
              className="hover:cursor-pointer text-xs font-medium text-amber-700 underline hover:text-amber-900"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Personal Information ── */}
        <Section title="Personal information">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="First name" value={profile.firstName} editing={editing} onChange={(v) => handleChange("firstName", v)} />
            <Field label="Last name" value={profile.lastName} editing={editing} onChange={(v) => handleChange("lastName", v)} />
            <Field label="Email address" value={profile.email} editing={editing} onChange={(v) => handleChange("email", v)} />
            <Field label="Phone" value={profile.phone} editing={editing} onChange={(v) => handleChange("phone", v)} />
            <Field label="Birthday" value={profile.birthday} inputType="date" editing={editing} onChange={(v) => handleChange("birthday", v)} />
            <Field label="Title" value={profile.title} editing={editing} onChange={(v) => handleChange("title", v)} />
          </div>
        </Section>

        {/* ── Address ── */}
        <Section title="Address">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Country" value={profile.country} editing={editing} onChange={(v) => handleChange("country", v)} />
            <Field label="City / State" value={profile.cityState} editing={editing} onChange={(v) => handleChange("cityState", v)} />
            <Field label="Street" value={profile.street} editing={editing} onChange={(v) => handleChange("street", v)} />
            <Field label="ZIP code" value={profile.zip} editing={editing} onChange={(v) => handleChange("zip", v)} />
          </div>
        </Section>

        {/* ── Preferences ── */}
        <Section title="Preferences">
          <div className="space-y-4">
            <PrefRow
              label="Dark mode"
              sub="View"
              checked={profile.darkMode}
              onChange={(v) => handleChange("darkMode", v)}
            />
            <div className="border-t border-gray-100 pt-4">
              <PrefRow
                label="Email notifications"
                sub="Receive updates via email"
                checked={profile.emailNotifications}
                onChange={(v) => handleChange("emailNotifications", v)}
              />
            </div>
          </div>
        </Section>

        {/* ── Account info (read-only) ── */}
        <Section title="Account">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Email verified</p>
              <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                profile.emailVerified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                {profile.emailVerified ? "Verified" : "Not verified"}
              </span>
            </div>
            {profile.createdAt && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Member since</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {profile.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
              </div>
            )}
          </div>
        </Section>

        {/* ── Actions ── */}
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={handleSignOut}
            className="hover:cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-95"
          >
            Sign out
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="hover:cursor-pointer rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 active:scale-95"
          >
            Delete account
          </button>
        </div>
      </div>

      {/* Modals / overlays */}
      {showDeleteModal && (
        <DeleteModal
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
      <Toast visible={showToast} />
    </main>
  );
}

/* ─── Layout helpers ─────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 border-b border-gray-100 pb-3 text-sm font-semibold text-gray-900">
        {title}
      </h2>
      {children}
    </div>
  );
}

function PrefRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function PencilIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" />
    </svg>
  );
}
