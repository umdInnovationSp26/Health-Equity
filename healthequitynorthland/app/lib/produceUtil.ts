export interface Produce{
    name: string
    amount: number
    units: string
}

export function mapDocToProduce(docData: any): Produce {

    return {
        name: docData.name || "Unknown",
        amount: 0,
        units: "lb" // default to pounds
    }

}

export function convertPoundsToKilograms(pounds: number): number {
    return pounds / 2.20462;
}

export function convertKilogramsToPounds(kilograms: number): number {
    return kilograms * 2.20462;
}

export function convertPoundsToOunces(pounds: number): number {
    return pounds * 16;
}

export function convertOuncesToPounds(ounces: number): number {
    return ounces / 16;
}

export function convertOuncesToKilograms(ounces: number): number {
    return ounces * 0.028349523;
}

export function convertKilogramsToOunces(kilograms: number): number {
    return kilograms * 35.27396;
}