import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { BarChart3, Users, Copy, Check, Users2, User, LogIn } from "lucide-react";
import {
  type FoodItem,
  type Settings,
  actionHint,
  addDays,
  daysLabel,
  startOfDay,
  generateHouseholdCode,
} from "@/lib/bastfore";

type Props = {
  items: FoodItem[];
  members?: string[]; // Tagit emot medlemslistan från hooken
  settings: Settings;
  onChange: (s: Settings) => void;
};

export function SettingsScreen({ items, members = [], settings, onChange }: Props) {
  const [toast, setToast] = useState<{ title: string; lines: string[] } | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const eaten = items.filter((i) => i.status === "consumed").length;
    const wasted = items.filter((i) => i.status === "wasted").length;
    const total = eaten + wasted;
    const rate = total > 0 ? Math.round((eaten / total) * 100) : 100;
    return { eaten, wasted, total, rate };
  }, [items]);

  const handleSaveUsername = () => {
    const cleanName = usernameInput.trim();
    if (cleanName) {
      onChange({ ...settings, username: cleanName });
    }
  };

  const handleCreateHousehold = () => {
    const newCode = generateHouseholdCode();
    onChange({ ...settings, householdId: newCode });
  };

  const handleJoinHousehold = () => {
    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.startsWith("HUSHÅLL-")) {
      onChange({ ...settings, householdId: cleanCode });
      setJoinCode("");
    }
  };

  const handleLeaveHousehold = () => {
    onChange({ ...settings, householdId: undefined });
  };

  const copyToClipboard = () => {
    if (settings.householdId) {
      navigator.clipboard.writeText(settings.householdId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
      <p className="mt-1 text-sm text-muted-foreground">Statistik och hushållskonfiguration</p>

      {/* DEL 1: KONTO/ANVÄNDARNAMN */}
      {!settings.username ? (
        <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-card animate-[fade-in_0.2s_ease]">
          <div className="flex items-center gap-2 text-primary">
            <User className="size-5" />
            <h2 className="text-base font-bold">Skapa användarkonto</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-normal">Välj ett användarnamn för att familjen ska se vem som lägger till och tar bort mat.</p>
          <div className="mt-4 flex gap-2">
            <input
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Ditt namn (Ex: Pappa, Alex)"
              className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-ring"
            />
            <button
              onClick={handleSaveUsername}
              disabled={!usernameInput.trim()}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40 flex items-center gap-1 active:scale-95 transition-all"
            >
              <LogIn className="size-4" /> Spara
            </button>
          </div>
        </section>
      ) : (
        /* DEL 2: HUSHÅLLSSYSTEM (Visas bara om man har ett konto) */
        <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-card animate-[fade-in_0.2s_ease]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Users className="size-5" />
              <h2 className="text-base font-bold">Delat hushåll</h2>
            </div>
            <span className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-semibold">👤 {settings.username}</span>
          </div>

          {settings.householdId ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aktivt hushåll</p>
              <div className="flex items-center justify-between rounded-2xl bg-muted p-4">
                <span className="font-mono font-black text-foreground text-sm tracking-wide">{settings.householdId}</span>
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 text-xs font-bold text-primary bg-background px-3 py-1.5 rounded-full border border-border shadow-sm active:scale-95 transition-all"
                >
                  {copied ? <Check className="size-3.5 text-fresh" /> : <Copy className="size-3.5" />}
                  {copied ? "Kopierad!" : "Kopiera"}
                </button>
              </div>

              {/* MEDLEMSLISTA SOM UPPDATERAS LIVE */}
              <div className="border-t border-border pt-3 mt-2">
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">👪 Medlemmar i hushållet ({members.length})</p>
                <ul className="mt-2 space-y-1.5">
                  {members.map((name) => (
                    <li key={name} className="flex items-center gap-2 text-sm font-medium text-foreground bg-background border border-border px-3 py-2 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-fresh animate-pulse" />
                      {name} {name === settings.username && <span className="text-[10px] text-muted-foreground font-normal">(Du)</span>}
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={handleLeaveHousehold}
                className="mt-4 block text-xs font-bold text-danger underline underline-offset-4"
              >
                Lämna detta hushåll
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <button
                onClick={handleCreateHousehold}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary border border-border py-3.5 text-sm font-bold text-secondary-foreground shadow-sm active:scale-[0.98] transition-all"
              >
                <Users2 className="size-4" />
                SKAPA HUSHÅLL
              </button>

              <div className="relative flex items-center my-2 text-xs font-bold text-muted-foreground uppercase tracking-widest before:content-[''] before:flex-1 before:border-b before:border-border before:mr-3 after:content-[''] after:flex-1 after:border-b after:border-border after:ml-3">
                eller
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Gå med i befintligt hushåll</p>
                <div className="flex gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Ex: HUSHÅLL-XXXXX"
                    className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none font-mono uppercase tracking-wide focus:border-ring"
                  />
                  <button
                    onClick={handleJoinHousehold}
                    disabled={!joinCode.trim()}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40 active:scale-95 transition-all"
                  >
                    Gå med
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Spar-Statistik */}
      <section className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-card">
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

      {/* Inställningar för påminnelser */}
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
