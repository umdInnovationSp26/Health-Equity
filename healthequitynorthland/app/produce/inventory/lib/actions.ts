import { db } from "@/app/lib/firebaseClient";
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  increment,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

const PRODUCE_COLLECTION = "produce";

// The produce page shows inventory totals by summing the `lb` field across
// every event's `produce` subcollection. Manually-set inventory levels are
// folded into those totals through this synthetic event bucket - the same one
// the addRemove page writes to - so a level set here shows up on that page.
const MANUAL_EVENT_ID = "manual-adjustments";

/**
 * Sum the `lb` field for every produce name across all events' `produce`
 * subcollections. This mirrors exactly what the produce page computes, so
 * numbers stay in sync between the two views.
 *
 * One collection-group query rather than a read of `event` plus a read per
 * event: the old shape cost 1+N round trips and got slower with every event
 * added, and this needs no per-event context to do the sum.
 *
 * Note the parent guard. A collection group matches *every* collection with
 * that id, and `produce` is also a top-level collection (the master item
 * list). Those docs have no `lb` and their ids are auto-ids rather than
 * produce names, so without the guard they'd land in `totals` as phantom
 * zero-lb entries keyed by random id. Subcollection docs are the only ones
 * with a parent document.
 */
export async function aggregateInventoryLbs(): Promise<Record<string, number>> {
  const snap = await getDocs(collectionGroup(db, "produce"));

  const totals: Record<string, number> = {};
  snap.docs.forEach((d) => {
    if (d.ref.parent.parent === null) return; // top-level `produce`, not an event's
    const name = d.id; // subcollection doc id is the produce name
    totals[name] = (totals[name] ?? 0) + (d.data().lb ?? 0);
  });

  return totals;
}

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
  const [snapshot, totals] = await Promise.all([
    getDocs(collection(db, PRODUCE_COLLECTION)),
    aggregateInventoryLbs(),
  ]);

  const items: ProduceStat[] = [];
  const seenNames = new Set<string>();

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const name = data.name ?? docSnap.id;
    seenNames.add(name);
    items.push({
      id: docSnap.id,
      name,
      counted: data.countedAt != null,
      // Show the same aggregated total the produce page shows, not a separate
      // lbs field on the master produce doc (which the produce page ignores).
      lbs: Math.round((totals[name] ?? 0) * 100) / 100,
    });
  });

  // Include produce that only exists in the inventory totals (e.g. a new name
  // typed into a harvest report) but was never registered in the master
  // produce list - otherwise it would never appear here to be counted.
  Object.keys(totals).forEach((name) => {
    if (seenNames.has(name)) return;
    items.push({
      id: name,
      name,
      counted: false,
      lbs: Math.round(totals[name] * 100) / 100,
    });
  });

  return items;
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
  produceName: string,
  desiredLbs: number,
  currentLbs: number
): Promise<void> {
  // "Set exact" via an increment against the current aggregate total: writing
  // (desired - current) into the manual-adjustments bucket makes the produce
  // page's summed total land on the desired level. Mirrors addRemove's
  // set-exact behavior.
  const delta = Math.round((desiredLbs - currentLbs) * 100) / 100;

  const batch = writeBatch(db);

  // The synthetic event doc must exist for getDocs("event") to list it.
  batch.set(
    doc(db, "event", MANUAL_EVENT_ID),
    { isManualAdjustments: true },
    { merge: true },
  );
  batch.set(
    doc(db, "event", MANUAL_EVENT_ID, "produce", produceName),
    { lb: increment(delta) },
    { merge: true },
  );

  // Mark the master produce doc as counted this session (drives the checkmark).
  // `name` is merged too so a harvest-only item (whose doc doesn't exist yet)
  // is created well-formed rather than as a nameless doc.
  batch.set(
    doc(db, PRODUCE_COLLECTION, itemId),
    { name: produceName, countedAt: serverTimestamp() },
    { merge: true },
  );

  await batch.commit();
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

/**
 * Clear only the "counted" check marks across every item, leaving the lbs
 * (the inventory levels the user just set) intact. This is what the "Submit"
 * bar on the Set New Inventory Levels page calls to finish a counting session:
 * the counts are already persisted per-item, so submitting just resets the
 * derived checkmarks so the list starts fresh next time.
 *
 * Batched writes cap at 500 ops, so this chunks the doc list just in case
 * the produce list ever grows past that.
 */
export async function clearAllCountMarks(): Promise<void> {
  const snapshot = await getDocs(collection(db, PRODUCE_COLLECTION));
  const docs = snapshot.docs;

  const CHUNK_SIZE = 500;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + CHUNK_SIZE);

    chunk.forEach((docSnap) => {
      batch.update(docSnap.ref, {
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
};

/**
 * Add a harvest to the inventory totals. Just like addRemove's submitDeltas,
 * each reported amount is folded into the totals by incrementing the item's
 * lbs under the synthetic harvest event - nothing else is recorded.
 *
 * Everything happens in one atomic batch.
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

    // Add to inventory totals.
    batch.set(
      doc(db, "event", HARVEST_EVENT_ID, "produce", name),
      { lb: increment(lbs) },
      { merge: true },
    );
  }

  await batch.commit();
}