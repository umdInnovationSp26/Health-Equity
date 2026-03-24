/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/app/lib/firebaseClient";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export const checkPasswordStrength = (pwd: string) => {
  if (pwd.length < 6) return "Password must be at least 6 characters";
  if (!/[A-Z]/.test(pwd))
    return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(pwd))
    return "Password must contain at least one lowercase letter";
  if (!/\d/.test(pwd)) return "Password must contain at least one number";
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(pwd))
    return "Password must contain at least one special character";
  return null;
};

export const createOrUpdateUserDoc = async (user: any) => {
  const userDocRef = doc(db, "users", user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    await setDoc(userDocRef, {
      email: user.email,
      displayName: user.displayName || user.email?.split("@")[0],
      darkMode: false,
      emailVerified: user.emailVerified,
      createdAt: serverTimestamp(),
      avatar: "",
      title: "",
    });
  } else {
    await updateDoc(userDocRef, {
      email: user.email,
      emailVerified: user.emailVerified,
    });
  }
};
