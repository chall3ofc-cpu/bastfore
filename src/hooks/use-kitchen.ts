import { useCallback, useEffect, useState, useRef } from "react";
import {
  type FoodItem,
  type ItemStatus,
  type Settings,
  SETTINGS_KEY,
  STORAGE_KEY,
  defaultSettings,
  seedItems,
  uid,
} from "@/lib/bastfore";

export function useKitchen() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);
  const isUpdatingRef = useRef(false);

  // 1. Ladda från LocalStorage vid start
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

  // 2. Spara lokalt och skicka live-synk till familjen via en öppen, godkänd kanal
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      
      // LIVE-SYNKNING: Skickar via en global, öppen JSON-storage-kanal som slipper CORS-blockeringar
      if (settings.householdId && !isUpdatingRef.current) {
        fetch(`https://val.town{settings.householdId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(items),
        }).catch(() => {/* Tyst felhantering om offline */});
      }
    }
  }, [items, hydrated, settings.householdId]);

  // 3. Spara inställningar lokalt
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings, hydrated]);

  // 4. AUTOMATISK LIVE-POLLNING: Hämtar uppdateringar var 3:e sekund om man är i ett hushåll
  useEffect(() => {
    if (!settings.householdId) return;

    let isActive = true;
    const fetchUpdates = async () => {
      while (isActive) {
        try {
          const res = await fetch(`https://val.town{settings.householdId}`);
          if (res.status === 200) {
            const remoteItems = await res.json();
            if (remoteItems && Array.isArray(remoteItems) && JSON.stringify(remoteItems) !== JSON.stringify(items)) {
              isUpdatingRef.current = true;
              setItems(remoteItems);
              setTimeout(() => { isUpdatingRef.current = false; }, 100);
            }
          }
        } catch (e) {
          /* Tyst felhantering vid tillfälligt nätverksfel */
        }
        // Väntar 3 sekunder innan den kollar om någon familjemedlem har blippat något nytt
        await new Promise((r) => setTimeout(r, 3000));
      }
    };

    fetchUpdates();

    return () => {
      isActive = false;
    };
  }, [settings.householdId, items]);

  const addItem = useCallback((name: string, expirationDate: Date, status: "pantry" | "pantry_dry" = "pantry") => {
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        name,
        expirationDate: expirationDate.toISOString(),
        status: status,
        dateAdded: new Date().toISOString(),
      },
    ]);
  }, []);

  const setStatus = useCallback((id: string, status: ItemStatus, previousStatus?: "pantry" | "pantry_dry") => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { 
              ...i, 
              status, 
              ...(previousStatus ? { previousStatus } : {}) 
            }
          : i
      )
    );
  }, []);

  const setExpiration = useCallback((id: string, date: Date) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, expirationDate: date.toISOString() } : i)),
    );
  }, []);

  const setName = useCallback((id: string, name: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name } : i)));
  }, []);

  return { items, addItem, setStatus, setExpiration, setName, settings, setSettings, hydrated };
}
