import { useCallback, useEffect, useState } from "react";
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
  // SPARAR INSTÄLLNINGAR OCH SYNCAR TIDEN TILL ONESIGNAL AUTOMATISKT
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

      // Skickar ditt valda klockslag direkt till internet-servern live!
      const win = window as any;
      if (win.OneSignal && settings.remindTime) {
        win.OneSignal.User.addTag("alarm_time", settings.remindTime);
      }
    }
  }, [settings, hydrated]);

  // AUTOMATISK ANSLUTNING FÖR PROFFS-NOTISER
  useEffect(() => {
    if (!hydrated) return;

    const script = document.createElement("script");
    script.src = "https://onesignal.com";
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      const win = window as any;
      if (win.OneSignal) {
        win.OneSignal.init({
          appId: "d2824bbb-17fb-4cd3-99d6-20657ce5e746",
          safari_web_id: "web.onesignal.auto.10a9a3b6-206c-482a-adab-f2e3be7da9ef",
          notifyButton: { enable: false },
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [hydrated]);

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

  return { items, addItem, setStatus, setExpiration, setName, settings, setSettings, hydrated };
}
