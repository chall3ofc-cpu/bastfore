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

  // 2. Spara lokalt och skicka live till hushållet via ett fritt och öppet P2P-relä
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      
      // Skickar kylen direkt till alla anslutna familjemedlemmar på millisekunden
      if (settings.householdId && !isUpdatingRef.current) {
        const cleanId = settings.householdId.replace(/[^A-Z0-9]/g, "");
        fetch(`https://fly.dev{cleanId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(items),
        }).catch(() => {});
      }
    }
  }, [items, hydrated, settings.householdId]);

  // 3. Spara inställningar lokalt
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings, hydrated]);
  // 4. AUTOMATISK DIREKT-LYSSNARE: Hämtar familjens ändringar live varannan sekund
  useEffect(() => {
    if (!settings.householdId) return;

    let isActive = true;
    const cleanId = settings.householdId.replace(/[^A-Z0-9]/g, "");

    const pollHousehold = async () => {
      while (isActive) {
        try {
          const res = await fetch(`https://fly.dev{cleanId}`);
          if (res.status === 200 && isActive) {
            const remoteItems = await res.json();
            if (remoteItems && Array.isArray(remoteItems)) {
              // Om familjens lista skiljer sig från vår, uppdatera skärmen live
              if (JSON.stringify(remoteItems) !== JSON.stringify(items)) {
                isUpdatingRef.current = true;
                setItems(remoteItems);
                setTimeout(() => { isUpdatingRef.current = false; }, 150);
              }
            }
          }
        } catch (e) {
          // Tyst hantering vid tillfälligt nätverkshopp
        }
        // Kollar av rummet varannan sekund för blixtsnabb respons
        await new Promise((r) => setTimeout(r, 2000));
      }
    };

    pollHousehold();

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
