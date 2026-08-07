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

  // Ladda från LocalStorage vid start
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

  // Spara lokalt när artiklar ändras
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      
      // LIVE-SYNKNING: Om vi har ett hushållsid och ändringen gjordes lokalt, skicka till familjen
      if (settings.householdId && !isUpdatingRef.current) {
        fetch(`https://pubnub.com{settings.householdId}/0`, {
          method: "POST",
          body: JSON.stringify({ action: "SYNC_ITEMS", payload: items }),
        }).catch(() => {/* Tyst felhantering om offline */});
      }
    }
  }, [items, hydrated, settings.householdId]);

  // Spara inställningar lokalt
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings, hydrated]);

  // LIVE-LYSSNARE: Lyssnar på uppdateringar från familjemedlemmar
  useEffect(() => {
    if (!settings.householdId) return;

    let isActive = true;
    const controller = new AbortController();

    const listenForUpdates = async () => {
      const url = `https://pubnub.com{settings.householdId}/0?tt=0`;
      
      while (isActive) {
        try {
          const res = await fetch(url, { signal: controller.signal });
          const data = await res.json();
          if (data && data.m && data.m.length > 0) {
            const lastMessage = JSON.parse(data.m[data.m.length - 1].d);
            if (lastMessage.action === "SYNC_ITEMS") {
              isUpdatingRef.current = true;
              setItems(lastMessage.payload);
              setTimeout(() => { isUpdatingRef.current = false; }, 100);
            }
          }
        } catch (e) {
          if (!isActive) break;
          await new Promise((r) => setTimeout(r, 3000)); // Vänta 3 sek innan omstart vid nätverksfel
        }
      }
    };

    listenForUpdates();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [settings.householdId]);

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
