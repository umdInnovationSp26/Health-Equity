import { db } from "@/app/lib/firebaseClient";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

const PRODUCE_COLLECTION = "produce";

export type ProduceStat = {
  id: string;
  name: string;
  counted: boolean; // derived, not stored - see getProduceItems
  lbs: number;
};

/**
 * Fetch every produce item for the inventory table.
 *
 * "counted" is not a real field in Firestore - it's derived from whether
 * countedAt is set. That avoids a stored boolean going out of sync with
 * the actual data (e.g. if lbs gets edited directly without going through
 * submitItemCount).
 *
 * Call this from page.tsx on mount (or wire it into a React Query /
 * SWR hook if you want caching + revalidation).
 */
export async function getProduceItems(): Promise<ProduceStat[]> {
  const snapshot = await getDocs(collection(db, PRODUCE_COLLECTION));

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name ?? "",
      counted: data.countedAt != null,
      lbs: data.lbs ?? 0,
    };
  });
}

/**
 * Save the count for a single item. This is what the CountOverlay's
 * "confirm and next" button should call.
 *
 * Fire this without awaiting in the UI (optimistic update) if you want
 * the arrow navigation to feel instant - just surface a toast on catch.
 */
export async function submitItemCount(
  itemId: string,
  lbs: number
): Promise<void> {
  const itemRef = doc(db, PRODUCE_COLLECTION, itemId);

  await updateDoc(itemRef, {
    lbs,
    countedAt: serverTimestamp(),
  });
}

/**
 * Mark an item as skipped/uncounted again, in case someone wants to
 * back out of a count they just entered.
 */
export async function clearItemCount(itemId: string): Promise<void> {
  const itemRef = doc(db, PRODUCE_COLLECTION, itemId);

  await updateDoc(itemRef, {
    lbs: 0,
    countedAt: null,
  });
}

/**
 * Reset every item's count in one batch - useful for a "start new
 * inventory count" button. Batched writes cap at 500 ops, so this
 * chunks the doc list just in case your produce list ever grows past that.
 */
export async function resetAllCounts(): Promise<void> {
  const snapshot = await getDocs(collection(db, PRODUCE_COLLECTION));
  const docs = snapshot.docs;

  const CHUNK_SIZE = 500;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + CHUNK_SIZE);

    chunk.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        lbs: 0,
        countedAt: null,
      });
    });

    await batch.commit();
  }
}