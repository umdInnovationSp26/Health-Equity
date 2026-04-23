import * as ics from "ics";
import { Event } from "@/app/lib/eventInterface"
// Import your interface if it's in a different file
// import { Event } from "@/types"; 

/**
 * Converts your Event objects into a valid ICS string.
 */
export function generateIcsString(events: Event[]): string {
  const formattedEvents: ics.EventAttributes[] = events.map((event) => {
    const start = event.dateStart;
    const end = event.dateEnd;

    return {
      uid: event.id,
      start: [
        start.getFullYear(),
        start.getMonth() + 1,
        start.getDate(),
        start.getHours(),
        start.getMinutes(),
      ],
      end: [
        end.getFullYear(),
        end.getMonth() + 1,
        end.getDate(),
        end.getHours(),
        end.getMinutes(),
      ],
      title: event.title,
      location: event.location,
      description: `${event.description}\n\nSupplies: ${event.suppliesInformation}\n\nNotes: ${event.notes}`,
      categories: [event.category],
    };
  });

  const { error, value } = ics.createEvents(formattedEvents);
  
  if (error) {
    console.error("ICS Error:", error);
    return "";
  }
  return value || "";
}

/**
 * Helper to trigger browser download
 */
export function triggerIcsDownload(icsString: string, filename: string) {
  if (!icsString) return;
  const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}