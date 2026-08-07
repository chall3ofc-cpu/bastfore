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
  // UPPDATERAD LIVE-SPÅRNING: Lägger till skaparen direkt och lyssnar efter familjen live
  useEffect(() => {
    if (!settings.householdId || !hydrated) return;

    const cleanRoomId = settings.householdId.replace(/[^A-Z0-9]/g, "");
    const localUser = settings.username || "Okänd Användare";
    
    // Sätter dig själv som startmedlem direkt så det aldrig står 0
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

    // Uppdaterar medlemslistan live så fort någon ansluter eller lämnar
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const currentMembers = Object.keys(state);
      
      // Säkerställer att ditt eget namn ALLTID är med, plus alla unika externa medlemmar
      const uniqueMembers = Array.from(new Set([localUser, ...currentMembers]));
      setMembers(uniqueMembers.sort());
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // Skickar upp ditt namn till Supabase-servern live
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

  const verifyHousehold = useCallback(async (code: string): Promise<boolean> => {
    const cleanCode = code.trim().toUpperCase();
    return cleanCode.startsWith("HUSHÅLL-") && cleanCode.length > 8;
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

  return { items, members, verifyHousehold, addItem, setStatus, setExpiration, setName, settings, setSettings, hydrated };
}
