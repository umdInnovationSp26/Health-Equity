import { Timestamp } from "firebase/firestore";

// convert a firebase timestamp to a js date
export function convertTimestampToDate(timestamp: any){
    // convert timestamp to date, or default date
    return timestamp?.toDate ? timestamp.toDate() : new Date();
}

export function convertDateToTimestamp(date: Date){
    return Timestamp.fromDate(date);
}

export function getDateTimeString(date: Date){
    // change to js date
    return date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).replace(',', ' -');
}

export function getDateOnlyString(date: Date){
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

export function getTimeOnlyString(date: Date){
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}