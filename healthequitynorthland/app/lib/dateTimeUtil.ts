import { Timestamp } from "firebase/firestore";

// convert a firebase timestamp to a js date
export function convertTimestampToDate(timestamp: any){
    // convert timestamp to date, or default date
    var dateEndObj = timestamp?.toDate ? timestamp.toDate() : new Date();

    // change to js date
    var formattedDate = dateEndObj.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).replace(',', ' -');

    return formattedDate;
}

export function convertDateToTimestamp(date: Date){
    return Timestamp.fromDate(date);
}