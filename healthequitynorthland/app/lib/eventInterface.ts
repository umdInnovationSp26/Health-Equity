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
    initialValue: number; // attendance counter
    increment: number; // attendance counter
    feedbackText: string;
    suppliesInformation: string;
    rawTimeStart: number; // used for faster sorting by date
    eventTypeId: number;
    notes: string;
    checkInLink?: string; // optional field for QR code check-in
    checkInFields?: string[]; // keys of enabled check-in fields
    trackableFields?: string[]; // keys of enabled trackable items
    customCheckInFields?: string[]; // labels for custom check-in fields
    customCheckInFieldTypes?: string[]; // input types for custom check-in fields, aligned with customCheckInFields
    customTrackableFields?: string[]; // labels for custom trackable items
    otherFieldLabel?: string;
    otherTrackableFieldLabel?: string;
    producePerPersonLb?: number | null; // lbs of produce handed out per person

    //new requirments 7/16/2006
    //#bags of health products distributed
    bagWithHealthProducts?: boolean;
    totalBagsDistributed?: number;
    //Produce
    produceDistributed?: boolean;
    totalProduceDistributed?: number;
    //Brochures
    brochuresDistributed?: boolean;
    totalBrochuresDistributed?: number;
    //Other
    otherSuppliesDistributed?: boolean;
    totalOtherSuppliesDistributed?: number;

    
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
        initialValue: docData.initialValue ?? 0,
        increment: docData.increment ?? 1,
        dateStart: formattedStartDate,
        dateEnd: formattedEndDate,
        checkInLink: docData.checkInLink ?? undefined,
        checkInFields: docData.checkInFields ?? [],
        otherFieldLabel: docData.otherFieldLabel ?? undefined,
        otherTrackableFieldLabel: docData.otherTrackableFieldLabel ?? undefined,
        trackableFields: docData.trackableFields ?? [],
        customCheckInFields: docData.customCheckInFields ?? [],
        customCheckInFieldTypes: docData.customCheckInFieldTypes ?? [],
        customTrackableFields: docData.customTrackableFields ?? [],
        producePerPersonLb: docData.producePerPersonLb ?? null,
        feedbackText: docData.feedbackText ?? "",
        suppliesInformation: docData.suppliesInformation ?? "",
        rawTimeStart: docData.timestampStart?.seconds || Number.MAX_VALUE, // used for sorting after grabbing the data
        eventTypeId: docData.eventType,
        notes: docData.notes
    
    }
}