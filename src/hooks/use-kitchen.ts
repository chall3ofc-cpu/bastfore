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
  // COOLA GENVÄGS-KOPPLINGEN: Svarar din iPhone om det finns utgångna varor just nu
  useEffect(() => {
    if (!hydrated) return;

    // Vi skapar en dold lyssnare i webbläsaren som din iPhone-genväg kan ropa på
    const handleShortcutRequest = (event: MessageEvent) => {
      if (event.data && event.data.action === "GET_URGENT_COUNT") {
        const threshold = addDays(settings.remindDaysBefore);
        const matches = items.filter(
          (i) => (i.status === "pantry" || i.status === "pantry_dry") && startOfDay(new Date(i.expirationDate)) <= threshold
        );
        
        // Vi skickar tillbaka exakt hur många varor som är akuta just nu
        window.parent.postMessage({ action: "URGENT_COUNT_REPLY", count: matches.length }, "*");
      }
    };

    window.addEventListener("message", handleShortcutRequest);
    return () => window.removeEventListener("message", handleShortcutRequest);
  }, [items, settings.remindDaysBefore, hydrated]);

  const addItem = useCallback((name: string, expirationDate: Date, status: "pantry" | "pantry_dry" = "pantry") => {
    setItems((prev) => [...prev, { id: uid(), name, expirationDate: expirationDate.toISOString(), status, dateAdded: new Date().toISOString() }]);
  }, []);

  const setStatus = useCallback((id: string, status: ItemStatus, previousStatus?: "pantry_dry" | "pantry") => {
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
