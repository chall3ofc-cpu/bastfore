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
  supabase,
} from "@/lib/bastfore";

export function useKitchen() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [members, setMembers] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const isUpdatingRef = useRef(false);
  const channelRef = useRef<any>(null);

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
      
      if (settings.householdId && channelRef.current && !isUpdatingRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "sync_items",
          payload: { items },
        });
      }
    }
  }, [items, hydrated, settings.householdId]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings, hydrated]);

  useEffect(() => {
    if (!settings.householdId || !hydrated) return;

    const cleanRoomId = settings.householdId.replace(/[^A-Z0-9]/g, "");
    const localUser = settings.username || "Okänd Användare";
    
    setMembers([localUser]);

    const channel = supabase.channel(`room_${cleanRoomId}`, {
      config: { 
        broadcast: { self: false }, 
        presence: { key: localUser } 
      },
    });

    channelRef.current = channel;

    channel.on("broadcast", { event: "sync_items" }, (response: any) => {
      if (response.payload && Array.isArray(response.payload.items)) {
        isUpdatingRef.current = true;
        setItems(response.payload.items);
        setTimeout(() => { isUpdatingRef.current = false; }, 100);
      }
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const currentMembers = Object.keys(state);
      const uniqueMembers = Array.from(new Set([localUser, ...currentMembers]));
      setMembers(uniqueMembers.sort());
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
        channel.send({ type: "broadcast", event: "request_sync", payload: {} });
      }
    });

    channel.on("broadcast", { event: "request_sync" }, () => {
      if (items.length > 0) {
        channel.send({ type: "broadcast", event: "sync_items", payload: { items } });
      }
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [settings.householdId, settings.username, hydrated, items]);

  // SKAPA HUSHÅLL: Sparar koden live i din households-tabell i Supabase
  const createHouseholdAction = useCallback(async () => {
    const newCode = "HUSHÅLL-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    try {
      await supabase.from("households").insert([{ id: newCode }]);
      setSettings((prev) => ({ ...prev, householdId: newCode }));
    } catch (e) {}
  }, []);

  // DEN ÄKTA OCH RIKTIGA DATABASKOPPLINGEN
  const verifyHousehold = useCallback(async (code: string): Promise<boolean> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode.startsWith("HUSHÅLL-") || cleanCode.length < 9) return false;
    
    try {
      const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000));
      
      const fetchPromise = (async () => {
        const { data, error } = await supabase
          .from("households")
          .select("id")
          .eq("id", cleanCode);
          
        return !error && data && data.length > 0;
      })();
      
      return Promise.race([fetchPromise, timeoutPromise]);
    } catch {
      return false;
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
