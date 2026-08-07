import { createFileRoute } from "@tanstack/react-router";
import { Refrigerator, ScanLine, Settings as Gear, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { urgencyOf } from "@/lib/bastfore";
import { useKitchen } from "@/hooks/use-kitchen";
import { KitchenScreen } from "@/components/kitchen-screen";
import { ScanScreen } from "@/components/scan-screen";
import { SettingsScreen } from "@/components/settings-screen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BästFöre – Håll koll på bäst före-datum" },
      {
        name: "description",
        content:
          "BästFöre hjälper dig minska matsvinn: skanna varor, se nedräkning till bäst före-datum och få en samlad daglig påminnelse.",
      },
      { property: "og:title", content: "BästFöre – Håll koll på bäst före-datum" },
      {
        property: "og:description",
        content: "Skanna matkassen, håll koll på kylen och frysen, och slipp slänga mat.",
      },
    ],
  }),
  component: App,
});

type Tab = "home" | "scan" | "settings";

function App() {
  const [tab, setTab] = useState<Tab>("home");
  const { items, members, verifyHousehold, addItem, setStatus, setExpiration, setName, settings, setSettings, hydrated } = useKitchen();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (hydrated) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [hydrated]);

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 animate-[fade-in_0.2s_ease]">
        <div className="flex flex-col items-center gap-4 text-center">
          <img 
            src="/logo.png" 
            alt="BästFöre Logga" 
            className="w-24 h-24 object-contain shadow-lg rounded-2xl animate-pulse" 
          />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">BästFöre</h1>
            <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-widest">Öppnar köket...</p>
          </div>
          <Loader2 className="size-5 animate-spin text-primary mt-4 opacity-70" />
        </div>
      </div>
    );
  }

  const urgentCount = items.filter(
    (i) => (i.status === "pantry" || i.status === "pantry_dry") && urgencyOf(i.expirationDate) === "red",
  ).length;

  const tabs = [
    { id: "home" as const, label: "Kylen & Skafferiet", Icon: Refrigerator, badge: urgentCount },
    { id: "scan" as const, label: "Blippa & Lägg till", Icon: ScanLine, badge: 0 },
    { id: "settings" as const, label: "Inställningar", Icon: Gear, badge: 0 },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background pb-28 animate-[fade-in_0.3s_ease]">
      {tab === "home" && (
        <KitchenScreen
          items={items}
          onConsume={(id) => setStatus(id, "consumed")}
          onMove={(id, to, prev) => setStatus(id, to, prev)}
          onEditDate={setExpiration}
          onEditName={setName}
        />
      )}
      {tab === "scan" && (
        <ScanScreen onAdd={(name, date, status) => addItem(name, date, status)} />
      )}
      {tab === "settings" && (
        <SettingsScreen items={items} members={members} verifyHousehold={verifyHousehold} settings={settings} onChange={setSettings} />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-stretch border-t border-border bg-card/95 px-2 pb-3 pt-2 backdrop-blur">
        {tabs.map(({ id, label, Icon, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 transition-colors",
              tab === id ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "relative rounded-full px-4 py-1 transition-colors",
                tab === id ? "bg-accent" : "bg-transparent",
              )}
            >
              <Icon className="size-5" strokeWidth={tab === id ? 2.4 : 1.8} />
              {badge > 0 && (
                <span
                  aria-label={`${badge} varor kräver åtgärd`}
                  className="absolute -right-0 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-[18px] text-danger-foreground"
                >
                  {badge}
                </span>
              )}
            </span>
            <span className="text-[10px] font-semibold leading-tight">{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
