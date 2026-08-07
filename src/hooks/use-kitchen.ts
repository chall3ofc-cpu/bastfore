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
  const [members, setMembers] = useState<string[]>([]); // NYTT: Håller koll på aktiva medlemmar
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

  // Sparar matvaror live i molndatabasen om man har ett hushåll
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      
      if (settings.householdId && settings.username && !isUpdatingRef.current) {
        const cleanId = settings.householdId.replace(/[^A-Z0-9]/g, "");
        
        // Sparar matlistan
        fetch(`https://fly.dev{cleanId}_items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(items),
        }).catch(() => {});

        // Registrerar och pingar användaren som aktiv medlem i hushållet
        fetch(`https://fly.dev{cleanId}_member_${settings.username}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: settings.username, lastActive: Date.now() }),
        }).catch(() => {});
      }
    }
  }, [items, hydrated, settings.householdId, settings.username]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings, hydrated]);

  // LIVE-LYSSNARE: Hämtar matvaror OCH medlemslistan live varannan sekund
  useEffect(() => {
    if (!settings.householdId) return;

    let isActive = true;
    const cleanId = settings.householdId.replace(/[^A-Z0-9]/g, "");

    const pollDatabase = async () => {
      while (isActive) {
        try {
          // 1. Hämta matvaror
          const resItems = await fetch(`https://fly.dev{cleanId}_items`);
          if (resItems.status === 200 && isActive) {
            const remoteItems = await resItems.json();
            if (remoteItems && Array.isArray(remoteItems) && JSON.stringify(remoteItems) !== JSON.stringify(items)) {
              isUpdatingRef.current = true;
              setItems(remoteItems);
              setTimeout(() => { isUpdatingRef.current = false; }, 150);
            }
          }

          // 2. Hämta alla medlemmar i hushållet
          const resMembers = await fetch(`https://fly.dev{cleanId}_member_`);
          if (resMembers.status === 200 && isActive) {
            const keys = await resMembers.json();
            const memberNames: string[] = [];
            
            for (const key of keys) {
              const name = key.split("_member_")[1];
              if (name && !memberNames.includes(name)) {
                memberNames.push(name);
              }
            }
            setMembers(memberNames);
          }
        } catch (e) {
          // Tyst felhantering
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };

    pollDatabase();

    return () => { isActive = false; };
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
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status, ...(previousStatus ? { previousStatus } : {}) } : i)));
  }, []);

  const setExpiration = useCallback((id: string, date: Date) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, expirationDate: date.toISOString() } : i)));
  }, []);

  const setName = useCallback((id: string, name: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name } : i)));
  }, []);

  return { items, members, addItem, setStatus, setExpiration, setName, settings, setSettings, hydrated };
}
