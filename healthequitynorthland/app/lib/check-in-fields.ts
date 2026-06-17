export const CheckInFieldOptions = [
  { key: "name", label: "Full name", defaultChecked: false },
  { key: "email", label: "Email address", defaultChecked: false },
  { key: "phoneNumber", label: "Phone number", defaultChecked: false },
  { key: "age", label: "Age", defaultChecked: false },
  { key: "zipCode", label: "Zip code", defaultChecked: false },
  { key: "raceEthnicity", label: "Race", defaultChecked: false },
] as const;

export type CheckInFieldKey = (typeof CheckInFieldOptions)[number]["key"];