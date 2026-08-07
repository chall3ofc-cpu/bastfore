import { useCallback, useEffect, useState } from "react";
import {
  type FoodItem,
  type ItemStatus,
  type Settings,
  SETTINGS_KEY,
  STORAGE_KEY,
  defaultSettings,
  seedItems,
  uid,
  addDays,
  startOfDay,
  daysLabel,
} from "@/lib/bastfore";

export function useKitchen() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setItems(raw ? (JSON.parse(raw) as FoodItem[]) : seedItems());
      const rawS = localStorage.getItem(SETTINGS_KEY);
      if (rawS) setSettings({ ...defaultSettings, ...(JSON.parse(rawS) as Settings) });
    } catch {
      setItems(seedItems());
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings, hydrated]);
  // NYTT: AUTOMATISKT PUSH-LARM SOM KOLLAR KLOCKAN I BAKGRUNDEN
  useEffect(() => {
    if (!hydrated) return;

    // Registrera bakgrundsarbetaren (Service Worker) i webbläsaren
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const checkTimeAndTriggerPush = () => {
      const now = new Date();
      const currentHourMinute = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      // Om klockan är exakt den tid användaren har valt i inställningar, bygg notisen
      if (currentHourMinute === settings.remindTime) {
        const threshold = addDays(settings.remindDaysBefore);
        const matches = items.filter(
          (i) => (i.status === "pantry" || i.status === "pantry_dry") && startOfDay(new Date(i.expirationDate)) <= threshold
        );

        if (matches.length > 0 && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const msg = matches.length === 1 
            ? `1 vara (${matches[0].name}) håller på att gå ut!` 
            : `${matches.length} varor håller på att gå ut! Öppna köket för att se listan.`;
          
          // Skicka kommandot till sw.js att tända telefonskärmen
          navigator.serviceWorker.controller.postMessage({
            action: 'PUSH_ALARM',
            message: msg
          });
        }
      }
    };

    // Kollar klockan en gång i minuten i tysthet
    const interval = setInterval(checkTimeAndTriggerPush, 60000);
    return () => clearInterval(interval);
  }, [settings.remindTime, settings.remindDaysBefore, items, hydrated]);

  const addItem = useCallback((name: string, expirationDate: Date, status: "pantry" | "pantry_dry" = "pantry") => {
    setItems((prev) => [...prev, { id: uid(), name, expirationDate: expirationDate.toISOString(), status, dateAdded: new Date().toISOString() }]);
  }, []);

  const setStatus = useCallback((id: string, status: ItemStatus, previousStatus?: "pantry" | "pantry_dry") => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status, ...(previousStatus ? { previousStatus } : {}) } : i)));
  }, []);

  const setExpiration = useCallback((id: string, date: Date) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, expirationDate: date.toISOString() } : i)));
  }, []);

  const setName = useCallback((id: string, name: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name } : i)));
  }, []);

  return { items, addItem, setStatus, setExpiration, setName, settings, setSettings, hydrated };
}
