export type ItemStatus = "pantry" | "freezer" | "consumed" | "pantry_dry" | "wasted";

export type FoodItem = {
  id: string;
  name: string;
  expirationDate: string; // ISO
  status: ItemStatus;
  previousStatus?: "pantry" | "pantry_dry";
  dateAdded: string; // ISO
};

export type Settings = {
  remindDaysBefore: number;
  remindTime: string;
};

export const STORAGE_KEY = "bastfore.items.v1";
export const SETTINGS_KEY = "bastfore.settings.v1";

export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (days: number, from: Date = new Date()) => {
  const x = startOfDay(from);
  x.setDate(x.getDate() + days);
  return x;
};

export const toISODateInput = (d: Date) => {
  const x = startOfDay(d);
  const m = `${x.getMonth() + 1}`.padStart(2, "0");
  const day = `${x.getDate()}`.padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
};

export const daysLeft = (iso: string) => {
  const diff = startOfDay(new Date(iso)).getTime() - startOfDay(new Date()).getTime();
  return Math.round(diff / 86_400_000);
};

export type Urgency = "red" | "yellow" | "green";

export const urgencyOf = (iso: string): Urgency => {
  const d = daysLeft(iso);
  if (d <= 2) return "red";
  if (d <= 5) return "yellow";
  return "green";
};

export const daysLabel = (iso: string) => {
  const d = daysLeft(iso);
  if (d < 0) return d === -1 ? "Utgången sedan 1 dag!" : `Utgången sedan ${Math.abs(d)} dagar!`;
  if (d === 0) return "Går ut idag";
  if (d === 1) return "1 dag kvar";
  return `${d} dagar kvar`;
};

export const actionHint = (iso: string) => {
  const d = daysLeft(iso);
  if (d <= 0) return "Action krävs!";
  if (d <= 2) return "Laga något gott!";
  return "Planera in den snart";
};

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const defaultSettings: Settings = { remindDaysBefore: 3, remindTime: "11:00" };

export const seedItems = (): FoodItem[] => {
  return [];
};
