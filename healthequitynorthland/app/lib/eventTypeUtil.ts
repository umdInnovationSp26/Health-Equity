{/* Event types */}
const OUTREACH = 0
const TABLING = 1
const PRODUCE = 2
const OTHER = 3

var eventTypeList = new Map<number, string>();

export function getEventType(typeId: number): string {
    switch(typeId){
        case OUTREACH:
            return "Outreach";
        case TABLING:
            return "Tabling";
        case PRODUCE:
            return "Produce Supply";
        case OTHER:
            return "Other";
        default:
            return "Unknown";
    }
}

export function getEventTypeSelect() {
    if(eventTypeList?.size <= 0){
        eventTypeList = new Map<number, string>();
        eventTypeList.set(0, getEventType(OUTREACH));
        eventTypeList.set(1, getEventType(TABLING));
        eventTypeList.set(2, getEventType(PRODUCE));
        eventTypeList.set(3, getEventType(OTHER));
    }
    return eventTypeList
}

export function getOutreachId(){
    return OUTREACH;
}

export function getTablingId(){
    return TABLING;
}

export function getProduceId(){
    return PRODUCE;
}

export function getOtherId(){
    return OTHER;
}

export {};
