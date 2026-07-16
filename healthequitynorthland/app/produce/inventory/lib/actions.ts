import { db } from "@/app/lib/firebaseClient";
import {
  collection,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

const PRODUCE_COLLECTION = "produce";
const HARVEST_COLLECTION = "harvests";

// Harvest lbs are folded into the inventory totals shown on the produce
// page. That page aggregates lbs across every event's `produce` subcollection,
// so - like the "manual-adjustments" bucket in addRemove - harvests get their
// own synthetic event doc rather than a top-level collection the page ignores.
const HARVEST_EVENT_ID = "harvest-reports";

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

/* ─── Harvests ────────────────────────────────────────────────── */

/** One produce item recorded in a harvest report. */
export type HarvestEntryInput = {
  produceName: string;
  lbs: number;
  /** Free-text storage location for this batch, e.g. "Cooler A". */
  location: string;
};

/** A persisted harvest record, as read back for display. */
export type HarvestRecord = {
  id: string;
  produceName: string;
  lbs: number;
  location: string;
  /** When the harvest was recorded. Null only while the write is in flight. */
  harvestedAt: Date | null;
};

/**
 * Persist a harvest report. Each entry is written to the `harvests` log
 * (with a server timestamp + location, so the produce page can show how old
 * a batch is and where it's stored) AND folded into the inventory totals by
 * incrementing the item's lbs under the synthetic harvest event.
 *
 * Everything happens in one atomic batch, so a partial harvest can never
 * land the log and the inventory totals out of sync.
 */
export async function submitHarvest(entries: HarvestEntryInput[]): Promise<void> {
  const valid = entries.filter((e) => e.produceName.trim() && e.lbs > 0);
  if (valid.length === 0) return;

  const batch = writeBatch(db);

  // Mirror addRemove: the synthetic event doc must exist for getDocs(event)
  // to list it when the produce page aggregates totals.
  batch.set(
    doc(db, "event", HARVEST_EVENT_ID),
    { isHarvestReports: true },
    { merge: true },
  );

  for (const entry of valid) {
    const name = entry.produceName.trim();
    const lbs = Math.round(entry.lbs * 100) / 100;

    // Harvest log entry (auto-generated id).
    batch.set(doc(collection(db, HARVEST_COLLECTION)), {
      produceName: name,
      lbs,
      location: entry.location.trim(),
      harvestedAt: serverTimestamp(),
    });

    // Add to inventory totals.
    batch.set(
      doc(db, "event", HARVEST_EVENT_ID, "produce", name),
      { lb: increment(lbs) },
      { merge: true },
    );
  }

  await batch.commit();
}

/**
 * Most recent harvests, newest first - drives the "Recent Harvests" section
 * on the produce page so users can see how fresh their stock is.
 */
export async function getRecentHarvests(max = 8): Promise<HarvestRecord[]> {
  const q = query(
    collection(db, HARVEST_COLLECTION),
    orderBy("harvestedAt", "desc"),
    limit(max),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const ts = data.harvestedAt;
    return {
      id: docSnap.id,
      produceName: data.produceName ?? "",
      lbs: data.lbs ?? 0,
      location: data.location ?? "",
      harvestedAt: ts instanceof Timestamp ? ts.toDate() : null,
    };
  });
}