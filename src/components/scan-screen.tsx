import { Check, Keyboard, CameraOff, RefreshCw, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { sv } from "date-fns/locale";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { startOfDay } from "@/lib/bastfore";
import { lookupProduct } from "@/lib/product-lookup";

// Ändrad så att appen kan ta emot destination (pantry eller pantry_dry)
type Props = { onAdd: (name: string, date: Date, status: "pantry" | "pantry_dry") => void };
type CamState = "idle" | "live" | "denied" | "unsupported";

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
]);
hints.set(DecodeHintType.TRY_HARDER, true);

export function ScanScreen({ onAdd }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);
  const [cam, setCam] = useState<CamState>("idle");

  const [sheetName, setSheetName] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [askName, setAskName] = useState<null | { prompt: string }>(null);
  const [draftName, setDraftName] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [looking, setLooking] = useState(false);

  const openSheet = (name: string, code?: string | null) => {
    setSheetName(name);
    setScannedCode(code ?? null);
    setDate(undefined);
  };

  const handleCode = useCallback(async (code: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLooking(true);
    try {
      navigator.vibrate?.(80);
    } catch {
      /* no-op */
    }
    const [name] = await Promise.all([
      lookupProduct(code),
      new Promise((r) => setTimeout(r, 500)),
    ]);
    setLooking(false);
    if (name) {
      openSheet(name, code);
    } else {
      setScannedCode(code);
      setAskName({ prompt: `Hittade inte streckkoden ${code}. Vad heter produkten?` });
      setDraftName("");
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCam("unsupported");
      return;
    }
    controlsRef.current?.stop();
    controlsRef.current = null;
    try {
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
      const controls = await reader.decodeFromConstraints(
        {
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        },
        videoRef.current!,
        (result) => {
          const text = result?.getText();
          if (text) void handleCode(text);
        },
      );
      controlsRef.current = controls;
      setCam("live");
    } catch {
      setCam("denied");
    }
  }, [handleCode]);

  useEffect(() => {
    startCamera();
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [startCamera]);

  useEffect(() => {
    if (!sheetName && !askName && !looking) busyRef.current = false;
  }, [sheetName, askName, looking]);

  // Uppdaterad submit-funktion som tar emot destinationstyp
  const submitTo = (destination: "pantry" | "pantry_dry") => {
    if (!sheetName || !date) return;
    onAdd(sheetName, startOfDay(date), destination);
    setSheetName(null);
    setScannedCode(null);
    setDate(undefined);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="relative px-5 pt-10">
      <img 
        src="/logo.png" 
        alt="BästFöre Logga" 
        className="absolute top-12 right-5 w-12 h-12 object-contain z-50 pointer-events-none shadow-md rounded-xl" 
      />

      <h1 className="text-4xl font-extrabold">Blippa</h1>
      <p className="mt-1 text-sm text-muted-foreground">Skanna vara efter vara ur matkassen</p>

      <div className="relative mt-5 h-72 overflow-hidden rounded-3xl bg-scanner">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cn(
            "size-full object-cover transition-opacity duration-300",
            cam === "live" ? "opacity-100" : "opacity-0",
          )}
        />

        {cam === "live" && (
          <>
            <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-dashed border-scanner-foreground/60" />
            <div className="pointer-events-none absolute inset-x-14 top-1/2 h-0.5 animate-[laser_2.4s_ease-in-out_infinite] bg-laser shadow-[0_0_18px_4px_var(--color-laser)]" />
            <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-sm font-medium text-scanner-foreground drop-shadow">
              Rikta kameran mot streckkoden
            </p>
          </>
        )}

        {cam === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm font-medium text-scanner-foreground/80">Startar kameran…</p>
          </div>
        )}

        {looking && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-foreground/50">
            <Loader2 className="size-7 animate-spin text-scanner-foreground" />
            <p className="text-sm font-semibold text-scanner-foreground">Slår upp produkten…</p>
          </div>
        )}

        {(cam === "denied" || cam === "unsupported") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <CameraOff className="size-8 text-scanner-foreground/80" />
            <p className="text-sm font-semibold text-scanner-foreground">
              {cam === "denied"
                ? "Ingen åtkomst till kameran"
                : "Kameran stöds inte i den här webbläsaren"}
            </p>
            <p className="text-xs text-scanner-foreground/70">
              Tillåt kameran i webbläsarens inställningar, eller skriv in varan manuellt.
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <button
                onClick={startCamera}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                <RefreshCw className="size-3.5" />
                Öppna inställningar
              </button>
              <button
                onClick={() => {
                  setAskName({ prompt: "Skriv produktens namn" });
                  setDraftName("");
                }}
                className="rounded-full border border-scanner-foreground/40 px-4 py-2 text-xs font-semibold text-scanner-foreground"
              >
                Skriv manuellt
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => {
          setScannedCode(null);
          setAskName({ prompt: "Skriv produktens namn" });
          setDraftName("");
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
      >
        <Keyboard className="size-4" />
        Går det inte att scanna? Skriv namn manuellt
      </button>

      {saved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/10">
          <div className="animate-[pop_0.5s_cubic-bezier(0.22,1,0.36,1)] rounded-full bg-primary p-6 text-primary-foreground">
            <Check className="size-12" />
          </div>
        </div>
      )}

      {askName && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/40 px-6">
          <div className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-sheet" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{askName.prompt}</h2>
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="T.ex. Krossade Tomater"
              className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-ring"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setAskName(null)}
                className="flex-1 rounded-full border border-input bg-background py-2.5 text-sm font-semibold text-foreground"
              >
                Avbryt
              </button>
              <button
                onClick={() => {
                  const n = draftName.trim();
                  if (n) {
                    setAskName(null);
                    openSheet(n, scannedCode);
                  }
                }}
                className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Nästa
              </button>
            </div>
          </div>
        </div>
      )}

      {sheetName && (
        <div className="fixed inset-0 z-40 flex items-end" onClick={() => setSheetName(null)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full animate-[sheet-up_0.34s_cubic-bezier(0.22,1,0.36,1)] overflow-y-auto rounded-t-3xl bg-card p-5 pb-8 shadow-sheet"
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
            <h2 className="text-xl font-bold">{sheetName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Välj bäst före-datum i kalendern</p>

            <div className="mt-4 rounded-3xl border border-border bg-background p-2">
              <Calendar
                mode="single"
                locale={sv}
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </div>

            {/* UPPDATERAT: Två knappar bredvid varandra för destination */}
            <div className="mt-5 flex gap-3">
              <button
                disabled={!date}
                onClick={() => submitTo("pantry")}
                className="flex-1 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-40 shadow-sm"
              >
                LÄGG I KYLEN
              </button>
              <button
                disabled={!date}
                onClick={() => submitTo("pantry_dry")}
                className="flex-1 rounded-full bg-secondary border border-border py-3.5 text-sm font-semibold text-secondary-foreground disabled:opacity-40 shadow-sm"
              >
                LÄGG I SKAFFERIET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
