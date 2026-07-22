export const CheckInTrackableOptions = [
  { key: "produce", label: "Produce", defaultChecked: false },
  { key: "bags", label: "Health Products", defaultChecked: false },
  { key: "brochures", label: "Brochures", defaultChecked: false },
  { key: "other", label: "Other Supplies", defaultChecked: false },
] as const;

export type CheckInTrackableKey = (typeof CheckInTrackableOptions)[number]["key"];