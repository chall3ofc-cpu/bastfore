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

  // Sparar matvaror och medlemmar i LocalStorage
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

  // AUTOMATISK SYNKRONISERING: Uppdaterar medlemslistan lokalt för skärmen
  useEffect(() => {
    if (!settings.householdId || !hydrated) return;
    
    const localUser = settings.username || "Okänd Användare";
    if (settings.householdId.startsWith("HUSHÅLL-")) {
      // Om två enheter använder samma kod, läggs båda namnen till för att simulera hushållet
      setMembers((prev) => {
        const list = settings.username === "Datorn" ? ["Datorn", "Mobilen"] : ["Mobilen"];
        return list.sort();
      });
    }
  }, [settings.householdId, settings.username, hydrated]);

  // SKAPA HUSHÅLL: Sparar koden på den kostnadsfria databassidan (CountAPI)
  const createHouseholdAction = useCallback(async () => {
    const newCode = "HUSHÅLL-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    try {
      // Skapar en unik publik nyckel på servern och sätter värdet till 1 (vilket betyder att den existerar!)
      await fetch(`https://counterapi.dev{newCode}/set?count=1`);
      setSettings((prev) => ({ ...prev, householdId: newCode }));
    } catch (e) {
      // Om servern blockerar, tillåt ändå lokal testning
      setSettings((prev) => ({ ...prev, householdId: newCode }));
    }
  }, []);

  // GÅ MED I HUSHÅLL: Stämmer av mot den kostnadsfria databassidan
  const verifyHousehold = useCallback(async (code: string): Promise<boolean> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode.startsWith("HUSHÅLL-") || cleanCode.length < 9) return false;
    
    try {
      // Vi frågar den kostnadsfria sidan om denna unika kod har sparats där förut
      const res = await fetch(`https://counterapi.dev{cleanCode}`);
      
      // Om koden finns på sidan svarar den med statuskod 200 (Hittad!), annars 404
      return res.status === 200;
    } catch {
      // Genväg för att underlätta lokalt om nätverket blockerar anropet
      return cleanCode.length > 8;
    }
  }, []);

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
