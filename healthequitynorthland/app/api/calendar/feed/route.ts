
import { generateIcsString } from "@/app/lib/calendarUtil";
import { mapDocToEvent } from "@/app/lib/eventInterface";
import { getAdminDb } from "@/app/lib/firebaseAdmin";

export async function GET(request: Request) {
  // NEVER DO A DELETE OR WRITE IN THIS FUNCTION!

  // get the token from url
  const { searchParams } = new URL(request.url);
  const providedToken = searchParams.get("token");

  // compare with correct token
  const secretToken = process.env.CALENDAR_SECRET_TOKEN;

  if (!providedToken || providedToken !== secretToken) {
    return new Response("Unauthorized: Invalid or missing calendar token.", { 
      status: 401 
    });
  }

  try {
    // fetch the data use firebase admin sdk
    const snapshot = await getAdminDb().collection("event").orderBy("rawTimeStart", "asc").get();

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