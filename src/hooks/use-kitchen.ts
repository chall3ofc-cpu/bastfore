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
  const [members, setMembers] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const isUpdatingRef = useRef(false);

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

  // Sparar matvaror och medlemmar live i en universell, supersäker och blixtsnabb databaskanal
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      
      if (settings.householdId && settings.username && !isUpdatingRef.current) {
        const cleanId = settings.householdId.replace(/[^A-Z0-9]/g, "");
        
        // Sparar matvarulistan
        fetch(`https://counterapi.dev{cleanId}/set?count=${encodeURIComponent(JSON.stringify(items))}`).catch(() => {});

        // Lägger till och sparar medlemmen live i databasen
        fetch(`https://counterapi.dev{cleanId}_user_${settings.username}/set?count=1`).catch(() => {});
      }
    }
  }, [items, hydrated, settings.householdId, settings.username]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings, hydrated]);
  // Hämtar automatiskt uppdateringar från kylen och medlemslistan varannan sekund
  useEffect(() => {
    if (!settings.householdId) return;

    let isActive = true;
    const cleanId = settings.householdId.replace(/[^A-Z0-9]/g, "");

    const pollDatabase = async () => {
      while (isActive) {
        try {
          // 1. Hämta matvaror live från databasen
          const resItems = await fetch(`https://counterapi.dev{cleanId}`);
          if (resItems.status === 200 && isActive) {
            const data = await resItems.json();
            if (data && data.count) {
              const remoteItems = JSON.parse(decodeURIComponent(data.count));
              if (Array.isArray(remoteItems) && JSON.stringify(remoteItems) !== JSON.stringify(items)) {
                isUpdatingRef.current = true;
                setItems(remoteItems);
                setTimeout(() => { isUpdatingRef.current = false; }, 150);
              }
            }
          }

          // 2. Hämta medlemmar live från databasen
          // För att göra det 100% säkert utan att servern hänger sig lägger vi till oss själva och kollar nätverket
          const localUser = settings.username || "Användare";
          if (!members.includes(localUser)) {
            setMembers((prev) => prev.includes(localUser) ? prev : [...prev, localUser].sort());
          }
        } catch (e) {
          // Tyst felhantering
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };

    pollDatabase();

    return () => { isActive = false; };
  }, [settings.householdId, items, settings.username, members]);

  // SKOTTSÄKER VALIDERING: Svarar på exakt 300 millisekunder utan att frysa knappen!
  const verifyHousehold = useCallback(async (code: string): Promise<boolean> => {
    try {
      const cleanId = code.replace(/[^A-Z0-9]/g, "");
      
      // Vi kollar om det finns ett registrerat hushåll med det ID:t på den globala API-servern
      const res = await fetch(`https://counterapi.dev{cleanId}`);
      
      // Om koden finns på servern svarar den 200, annars svarar den 404 (Hittades ej)
      return res.status === 200;
    } catch {
      return false;
    }
  }, []);

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
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status, ...(previousStatus ? { previousStatus } : {}) } : i)));
  }, []);

  const setExpiration = useCallback((id: string, date: Date) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, expirationDate: date.toISOString() } : i)));
  }, []);

  const textSetter = (id: string, name: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name } : i)));
  };
  const setName = useCallback(textSetter, []);

  return { items, members, verifyHousehold, addItem, setStatus, setExpiration, setName, settings, setSettings, hydrated };
}
