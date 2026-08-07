import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";
import {
  type FoodItem,
  type Settings,
  actionHint,
  addDays,
  daysLabel,
  startOfDay,
} from "@/lib/bastfore";

type Props = {
  items: FoodItem[];
  settings: Settings;
  onChange: (s: Settings) => void;
};

export function SettingsScreen({ items, settings, onChange }: Props) {
  const [toast, setToast] = useState<{ title: string; lines: string[] } | null>(null);

  const stats = useMemo(() => {
    const eaten = items.filter((i) => i.status === "consumed").length;
    const wasted = items.filter((i) => i.status === "wasted").length;
    const total = eaten + wasted;
    const rate = total > 0 ? Math.round((eaten / total) * 100) : 100;
    return { eaten, wasted, total, rate };
  }, [items]);

  const runAlarm = () => {
    const threshold = addDays(settings.remindDaysBefore);
    const matches = items
      .filter((i) => (i.status === "pantry" || i.status === "pantry_dry") && startOfDay(new Date(i.expirationDate)) <= threshold)
      .sort((a, b) => +new Date(a.expirationDate) - +new Date(b.expirationDate));

    setToast(
      matches.length === 0
        ? { title: "✅ Inga varor går ut snart", lines: ["Allt ser fint ut i kylen just nu."] }
        : {
            title: `⚠️ ${matches.length} ${matches.length === 1 ? "vara behöver" : "varor behöver"} ätas upp snart!`,
            lines: matches.map((m) => `- ${m.name} (${daysLabel(m.expirationDate)} - ${actionHint(m.expirationDate)})`),
          },
    );
    setTimeout(() => setToast(null), 8000);
  };

  const renderDayButton = (d: number) => (
    <button
      key={d}
      onClick={() => onChange({ ...settings, remindDaysBefore: d })}
      className={cn(
        "rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors",
        settings.remindDaysBefore === d ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground",
      )}
    >
      {d} {d === 1 ? "dag innan" : "dagar innan"}
    </button>
  );
  return (
    <div className="relative px-5 pt-10">
      <img 
        src="/logo.png" 
        alt="BästFöre Logga" 
        className="absolute top-12 right-5 w-12 h-12 object-contain z-50 pointer-events-none shadow-md rounded-xl" 
      />

      <h1 className="text-4xl font-extrabold">Inställningar</h1>
      <p className="mt-1 text-sm text-muted-foreground">Statistik och aviseringar</p>

      {/* Spar-Statistik */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 text-primary">
          <BarChart3 className="size-5" />
          <h2 className="text-base font-bold">Din Spar-Statistik</h2>
        </div>
        <div className="mt-4">
          <p className="text-4xl font-black text-foreground">{stats.rate}%</p>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">Av alla dina hanterade varor har ätits upp</p>
        </div>
        <div className="mt-4 h-3 w-full rounded-full bg-muted overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", stats.rate > 80 ? "bg-fresh" : stats.rate > 50 ? "bg-warn" : "bg-danger")}
            style={{ width: `${stats.rate}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-center text-xs font-medium text-muted-foreground">
          <div className="border-r border-border">
            <span className="font-bold text-foreground">{stats.eaten}</span> Ätna varor
          </div>
          <div>
            <span className="font-bold text-foreground">{stats.wasted}</span> Slängda varor
          </div>
        </div>
      </section>

      {/* Påminnelser */}
      <section className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-base font-bold">Påminn mig från (Dagar innan)</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {renderDayButton(1)}
          {renderDayButton(2)}
          {renderDayButton(3)}
          {renderDayButton(4)}
          {renderDayButton(5)}
          {renderDayButton(7)}
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-base font-bold">Tid för påminnelse</h2>
        <input
          type="time"
          value={settings.remindTime}
          onChange={(e) => onChange({ ...settings, remindTime: e.target.value })}
          className="mt-3 w-full rounded-2xl border border-input bg-background px-4 py-3 text-2xl font-bold tabular-nums outline-none focus:border-ring"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Alla varor buntas ihop i en enda påminnelse kl. {settings.remindTime}.
        </p>
      </section>

      <button
        onClick={runAlarm}
        className="mt-6 w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-card transition-transform active:scale-[0.98]"
      >
        🧪 Testa påminnelser direkt
      </button>

      {toast && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md animate-[toast-down_0.35s_cubic-bezier(0.22,1,0.36,1)] rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-sheet">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">BästFöre</p>
          <p className="mt-1 text-base font-bold">{toast.title}</p>
          <div className="mt-1.5 space-y-0.5">
            {toast.lines.map((l) => (
              <p key={l} className="text-sm text-muted-foreground">{l}</p>
            ))}
          </div>
          <button onClick={() => setToast(null)} className="mt-3 text-sm font-semibold text-primary">Stäng</button>
        </div>
      )}
    </div>
  );
}
