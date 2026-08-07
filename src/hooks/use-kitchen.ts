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
      
      if (settings.householdId && settings.username && !isUpdatingRef.current) {
        const cleanId = settings.householdId.replace(/[^A-Z0-9]/g, "");
        
        fetch(`https://fly.dev{cleanId}_items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(items),
        }).catch(() => {});

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
  useEffect(() => {
    if (!settings.householdId) return;

    let isActive = true;
    const cleanId = settings.householdId.replace(/[^A-Z0-9]/g, "");

    const pollDatabase = async () => {
      while (isActive) {
        try {
          const resItems = await fetch(`https://fly.dev{cleanId}_items`);
          if (resItems.status === 200 && isActive) {
            const remoteItems = await resItems.json();
            if (remoteItems && Array.isArray(remoteItems) && JSON.stringify(remoteItems) !== JSON.stringify(items)) {
              isUpdatingRef.current = true;
              setItems(remoteItems);
              setTimeout(() => { isUpdatingRef.current = false; }, 150);
            }
          }

          const resKeys = await fetch(`https://fly.dev{cleanId}_member_`);
          if (resKeys.status === 200 && isActive) {
            const keys = await resKeys.json();
            const memberNames: string[] = [];
            
            if (Array.isArray(keys)) {
              for (const key of keys) {
                const searchStr = `${cleanId}_member_`;
                const idx = key.indexOf(searchStr);
                if (idx !== -1) {
                  const name = key.substring(idx + searchStr.length);
                  if (name && !memberNames.includes(name)) {
                    memberNames.push(name);
                  }
                }
              }
            }
            setMembers(memberNames.sort());
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

  // UPPDATERAD: Avbryter sökningen automatiskt efter 1.5 sekunder om koden är felaktig
  const verifyHousehold = useCallback(async (code: string): Promise<boolean> => {
    // Skapar en avbryts-kontroll (AbortController)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1500 ms = 1.5 sekund max!

    try {
      const cleanId = code.replace(/[^A-Z0-9]/g, "");
      const res = await fetch(`https://fly.dev{cleanId}_items`, {
        signal: controller.signal, // Kopplar tidsgränsen till nätverksanropet
      });
      
      clearTimeout(timeoutId); // Stäng av timern om servern hann svara i tid
      return res.status === 200;
    } catch {
      clearTimeout(timeoutId);
      return false; // Om timern stängde ner anropet tolkar appen det direkt som att koden är fel
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
