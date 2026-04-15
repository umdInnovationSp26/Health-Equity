import { db } from "@/app/lib/firebaseClient";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { generateIcsString } from "@/app/lib/calendarUtil";
import { mapDocToEvent } from "@/app/lib/eventInterface";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  // 1. Extract the token from the URL
  const { searchParams } = new URL(request.url);
  const providedToken = searchParams.get("token");

  // 2. Compare with our secret environment variable
  const secretToken = process.env.CALENDAR_SECRET_TOKEN;

  if (!providedToken || providedToken !== secretToken) {
    return new Response("Unauthorized: Invalid or missing calendar token.", { 
      status: 401 
    });
  }

  try {
    // 3. Fetch data using Admin SDK (bypasses security rules)
    const snapshot = await adminDb.collection("event").orderBy("rawTimeStart", "asc").get();

    if (snapshot.empty) {
      return new Response("BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR", {
        headers: { "Content-Type": "text/calendar" },
      });
    }

    const events = snapshot.docs.map((doc: any) => mapDocToEvent(doc.id, doc.data()));

    const icsString = generateIcsString(events as any);

    return new Response(icsString, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="garden-feed.ics"',
      },
    });
  } catch (error: any) {
    console.error("Calendar Feed Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}