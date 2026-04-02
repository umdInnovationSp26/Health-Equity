
const COMMUNITY = 0
const TABLING = 1
const PRODUCE = 2

export function getEventType(typeId: number): string {
    switch(typeId){
        case COMMUNITY:
            return "Community";
        case TABLING:
            return "Tabling";
        case PRODUCE:
            return "Produce";
        default:
            return "Unknown";
    }
}

export {};