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
  // ÄKTA LIVE-LYSSNARE: Hämtar medlemslistan live från CountAPI varannan sekund
  useEffect(() => {
    if (!settings.householdId || !hydrated) return;

    let isActive = true;
    const cleanId = settings.householdId.replace(/[^A-Z0-9]/g, "");

    const pollMembers = async () => {
      while (isActive) {
        try {
          // Vi frågar CountAPI efter medlemslistan för detta hushåll
          const res = await fetch(`https://counterapi.dev{cleanId}_members`);
          if (res.status === 200 && isActive) {
            const data = await res.json();
            if (data && data.count) {
              // Avkodar textsträngen med alla namn från servern
              const remoteMembers = JSON.parse(decodeURIComponent(data.count));
              if (Array.isArray(remoteMembers)) {
                setMembers(remoteMembers.sort());
              }
            }
          }
        } catch (e) {}
        await new Promise((r) => setTimeout(r, 2000)); // Kollar varannan sekund
      }
    };

    pollMembers();

    return () => {
      isActive = false;
    };
  }, [settings.householdId, hydrated]);

  // ÄKTA SKAPA HUSHÅLL: Sparar koden och skaparens namn på CountAPI
  const createHouseholdAction = useCallback(async () => {
    if (!settings.username) return;
    const newCode = "HUSHÅLL-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    const cleanId = newCode.replace(/[^A-Z0-9]/g, "");
    
    try {
      // 1. Registrera att hushållskoden existerar i molnet
      await fetch(`https://counterapi.dev{cleanId}/set?count=1`);
      
      // 2. Skapa medlemslistan med skaparens namn
      const startList = [settings.username];
      await fetch(`https://counterapi.dev{cleanId}_members/set?count=${encodeURIComponent(JSON.stringify(startList))}`);
      
      setSettings((prev) => ({ ...prev, householdId: newCode }));
    } catch (e) {
      setSettings((prev) => ({ ...prev, householdId: newCode }));
    }
  }, [settings.username]);

  // ÄKTA GÅ MED: Kollar om koden finns på CountAPI på riktigt, och lägger till ditt namn i listan
  const verifyHousehold = useCallback(async (code: string): Promise<boolean> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode.startsWith("HUSHÅLL-") || cleanCode.length < 9) return false;
    if (!settings.username) return false;

    const cleanId = cleanCode.replace(/[^A-Z0-9]/g, "");

    try {
      // 1. Fråga CountAPI om hushållskoden existerar på riktigt
      const resCheck = await fetch(`https://counterapi.dev{cleanId}`);
      if (resCheck.status !== 200) return false; // Koden finns inte! Visa rött direkt.

      // 2. Koden finns! Hämta den nuvarande medlemslistan från servern
      const resList = await fetch(`https://counterapi.dev{cleanId}_members`);
      let currentMembers = [settings.username];
      
      if (resList.status === 200) {
        const listData = await resList.json();
        if (listData && listData.count) {
          const parsed = JSON.parse(decodeURIComponent(listData.count));
          if (Array.isArray(parsed)) {
            currentMembers = Array.from(new Set([...parsed, settings.username]));
          }
        }
      }

      // 3. Skicka upp den uppdaterade medlemslistan till molnet
      await fetch(`https://counterapi.dev{cleanId}_members/set?count=${encodeURIComponent(JSON.stringify(currentMembers))}`);
      return true;
    } catch {
      return false;
    }
  }, [settings.username]);

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

  return { items, members, verifyHousehold, createHouseholdAction, addItem, setStatus, setExpiration, setName, settings, setSettings, hydrated };
}
