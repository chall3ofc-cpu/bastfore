import { Snowflake, Check, LogOut, AlertTriangle, Search, CalendarDays, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { sv } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { type FoodItem, daysLabel, urgencyOf, startOfDay } from "@/lib/bastfore";

type Props = {
  items: FoodItem[];
  onConsume: (id: string) => void;
  onMove: (id: string, to: "pantry" | "freezer" | "pantry_dry" | "wasted", prev?: "pantry" | "pantry_dry") => void;
  onEditDate: (id: string, date: Date) => void;
  onEditName: (id: string, name: string) => void;
};

const tone = {
  red: "bg-danger-bg border-danger-border",
  yellow: "bg-warn-bg border-warn-border",
  green: "bg-fresh-bg border-fresh-border",
} as const;

const toneText = {
  red: "text-danger",
  yellow: "text-warn",
  green: "text-fresh",
} as const;

export function KitchenScreen({ items, onConsume, onMove, onEditDate, onEditName }: Props) {
  const [view, setView] = useState<"pantry" | "pantry_dry" | "freezer">("pantry");
  const [leaving, setLeaving] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  const commitName = (id: string) => {
    const v = nameDraft.trim();
    if (v) onEditName(id, v);
    setEditingName(null);
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => i.status === view)
      .filter((i) => (q ? i.name.toLowerCase().includes(q) : true))
      .sort((a, b) => +new Date(a.expirationDate) - +new Date(b.expirationDate));
  }, [items, view, query]);

  const leave = (id: string, fn: () => void) => {
    setLeaving((p) => [...p, id]);
    setTimeout(() => {
      fn();
      setLeaving((p) => p.filter((x) => x !== id));
    }, 320);
  };

  return (
    <div className="relative px-5 pt-10">
      <img 
        src="/logo.png" 
        alt="BästFöre Logga" 
        className="absolute top-12 right-5 w-12 h-12 object-contain z-50 pointer-events-none shadow-md rounded-xl" 
      />

      <h1 className="text-4xl font-extrabold">Mitt Kök</h1>
      <p className="mt-1 text-sm text-muted-foreground">Håll koll på dina bäst före-datum</p>

      <div className="mt-5 flex rounded-full bg-muted p-1 gap-1">
        {(["pantry", "pantry_dry", "freezer"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "flex-1 rounded-full py-2.5 text-xs font-semibold transition-all duration-200 truncate",
              view === v
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v === "pantry" ? "Kylen" : v === "pantry_dry" ? "Skafferiet" : "Frysen"}
          </button>
        ))}
      </div>

      <div className="sticky top-0 z-20 -mx-5 mt-3 bg-background/95 px-5 py-3 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök vara…"
            aria-label="Sök vara"
            className="w-full rounded-full border border-input bg-card py-3 pl-11 pr-4 text-sm outline-none focus:border-ring"
          />
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-20 px-6 text-center">
          <p className="text-base font-medium text-muted-foreground">
            {query.trim()
              ? "Inga varor matchar din sökning."
              : 'Här var det tomt! Tryck på "Blippa & Lägg till" för att se dina varor här.'}
          </p>
        </div>
      ) : (
        <ul className="mt-2 space-y-3">
          {list.map((item) => {
            const u = urgencyOf(item.expirationDate);
            const frozen = item.status === "freezer";
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-2 overflow-hidden rounded-2xl border p-4 shadow-card transition-all",
                  frozen ? "border-border bg-card" : tone[u],
                  leaving.includes(item.id) && "animate-[fade-out-card_0.32s_ease_forwards]",
                )}
              >
                <div className="min-w-0 flex-1">
                  {editingName === item.id ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      aria-label="Redigera produktnamn"
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={() => commitName(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitName(item.id);
                        if (e.key === "Escape") setEditingName(null);
                      }}
                      className="w-full rounded-lg border border-input bg-card px-2 py-1 text-base font-semibold outline-none focus:border-ring"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingName(item.id);
                        setNameDraft(item.name);
                      }}
                      aria-label="Ändra produktnamn"
                      className="block w-full truncate text-left text-base font-semibold"
                    >
                      {item.name}
                    </button>
                  )}
                  <button
                    onClick={() => setEditing(item)}
                    aria-label="Ändra datum"
                    className={cn(
                      "mt-0.5 flex items-center gap-1 text-sm font-medium underline underline-offset-4",
                      frozen ? "text-muted-foreground" : toneText[u],
                    )}
                  >
                    {!frozen && u === "red" && <AlertTriangle className="size-4" />}
                    {frozen ? "Fryst – nedräkning pausad" : daysLabel(item.expirationDate)}
                    <CalendarDays className="size-3.5 opacity-70" />
                  </button>
                </div>

                {/* Soptunna skickar nu "wasted" helt korrekt via onMove */}
                <button
                  aria-label="Slängd"
                  onClick={() => leave(item.id, () => onMove(item.id, "wasted"))}
                  className="flex flex-col items-center gap-0.5 rounded-xl bg-destructive px-2.5 py-2 text-destructive-foreground transition-transform active:scale-95"
                >
                  <Trash2 className="size-4" />
                  <span className="text-[10px] font-semibold">Slängd</span>
                </button>

                <button
                  aria-label="Uppäten"
                  onClick={() => leave(item.id, () => onConsume(item.id))}
                  className="flex flex-col items-center gap-0.5 rounded-xl bg-primary px-2.5 py-2 text-primary-foreground transition-transform active:scale-95"
                >
                  <Check className="size-4" />
                  <span className="text-[10px] font-semibold">Uppäten</span>
                </button>

                <button
                  aria-label={frozen ? "Ta ut" : "Frys in"}
                  onClick={() =>
                    leave(item.id, () => {
                      if (frozen) {
                        const target = item.previousStatus || "pantry";
                        onMove(item.id, target);
                      } else {
                        onMove(item.id, "freezer", view !== "freezer" ? view : "pantry");
                      }
                    })
                  }
                  className="flex flex-col items-center gap-0.5 rounded-xl bg-secondary px-2.5 py-2 text-secondary-foreground transition-transform active:scale-95"
                >
                  {frozen ? <LogOut className="size-4" /> : <Snowflake className="size-4" />}
                  <span className="text-[10px] font-semibold">{frozen ? "Ta ut" : "Frys in"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <div className="fixed inset-0 z-40 flex items-end" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full animate-[sheet-up_0.34s_cubic-bezier(0.22,1,0.36,1)] overflow-y-auto rounded-t-3xl bg-card p-5 pb-8 shadow-sheet"
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
            <h2 className="text-xl font-bold">{editing.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Justera bäst före-datum</p>

            <div className="mt-4 rounded-3xl border border-border bg-background p-2">
              <Calendar mode="single" locale={sv} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
