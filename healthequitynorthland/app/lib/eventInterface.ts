import { convertTimestampToDate } from "./dateTimeUtil";
import { getEventType } from "./eventTypeUtil";

/** A HEN event */
export interface Event {
    id: string;         
    title: string;     
    description: string;
    category: string;    
    location: string;    
    dateStart: Date;
    dateEnd: Date;            
    attendees: number; 
    feedbackText: string;
    suppliesInformation: string;
    rawTimeStart: number; // used for faster sorting by date
    eventTypeId: number;
    notes: string;
}


// used to map firebase document data to an Event
export function mapDocToEvent(id: string, docData: any): Event {

    // Convert Firebase Timestamp to a readable string
    const formattedStartDate = convertTimestampToDate(docData.timestampStart);
    const formattedEndDate = convertTimestampToDate(docData.timestampEnd);

    return {
        id: id,
        title: docData.title || "Unknown",
        description: docData.description ?? "",
        category: getEventType(docData.eventType),
        location: docData.location || "TBD",
        attendees: docData.attendees ?? 0,
        dateStart: formattedStartDate,
        dateEnd: formattedEndDate,
        feedbackText: docData.feedbackText ?? "",
        suppliesInformation: docData.eventInformation ?? "",
        rawTimeStart: docData.timestampStart?.seconds || Number.MAX_VALUE, // used for sorting after grabbing the data
        eventTypeId: docData.eventType,
        notes: docData.notes
    
    }
}