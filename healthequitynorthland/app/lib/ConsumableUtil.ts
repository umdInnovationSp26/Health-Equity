/** Base class for any quantifiable item with units (produce, prepared food, compost, etc.) */
export class Consumable {
    name: string;
    amount: number;
    units: string;

    constructor(name: string, amount: number, units: string) {
        this.name = name;
        this.amount = amount;
        this.units = units;
    }
}

/** A specific kind of Consumable representing raw produce */
export class Produce extends Consumable {
    constructor(name: string, amount: number = 0, units: string = "lb") {
        super(name, amount, units);
    }
}


/** Maps a main office supply collection doc to a global office supply option */
export class OfficeSupply extends Consumable {
    constructor(name: string, amount: number = 0, units: string = "lb") {
        super(name, amount, units);
    }
}

/** Maps a main Produce collection doc to a global produce option */
export function mapDocToProduceOption(docData: any): Produce {
    return new Produce(docData.name || "Unknown", 0, "lb");
}

export function mapDocToEventProduce(produceName: string, docData: any): Produce {
    return new Produce(produceName || "Unknown", docData.lb || 0, "lb");
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