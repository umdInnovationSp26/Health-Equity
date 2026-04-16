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

/** HTML time is formatted in hr:mn for tsx time inputs */
export function getTimeInHTML (date: Date | undefined) {
  if (!date) return "";
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
};

/** HTML date is formatted in yyyy-mm-dd for tsx date inputs */
export function getDateInHTML (date: Date | undefined) {
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}