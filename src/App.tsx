import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Engine, type UIState } from "./game/engine";
import { BIRDS } from "./game/birds";
import {
  TitleScreen, IntroOverlay, HUD, EncounterPanel, GuideOverlay,
  DialogBox, PauseOverlay, VictoryOverlay, TouchDeck,
} from "./components/screens";

const initialUI: UIState = {
  screen: "title",
  introStep: 0,
  introTotal: 3,
  paused: false,
  muted: false,
  guideOpen: false,
  hasSave: false,
  dialog: null,
  hud: {
    score: 0, seen: 0, photos: 0, total: BIRDS.length,
    clock: "07:00", phaseName: "Amanecer", zone: "Sendero del Odiel", cebos: 3,
    hint: "",
  },
  encounter: null,
  guide: Object.fromEntries(BIRDS.map((b) => [b.id, { seen: false, photo: 0 }])),
  victory: null,
  toasts: [],
};

// ─── Detección de dispositivo táctil y orientación ─────────────────────────
// Cualquier capacidad táctil activa el modo consola (móviles, tablets y
// vistas previas con entrada táctil emulada).
function detectTouch(): boolean {
  try {
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return true;
    if (window.matchMedia("(pointer: coarse)").matches) return true;
    if ("ontouchstart" in window) return true;
    if ((navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints != null
      && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 0) return true;
  } catch { /* asume escritorio */ }
  return false;
}

function useHandheld() {
  const [touch, setTouch] = useState(detectTouch);
  const [landscape, setLandscape] = useState(
    () => window.innerWidth > window.innerHeight
  );
  useEffect(() => {
    const onResize = () => {
      setLandscape(window.innerWidth > window.innerHeight);
      setTouch(detectTouch());
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return { touch, landscape };
}

// ─── Marco 16:9 que se ajusta al hueco disponible (letterbox limpio) ────────
function Frame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 320, h: 180 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(200, Math.min(r.width, (r.height * 16) / 9));
      setBox({ w, h: (w * 9) / 16 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center p-2 sm:p-3">
      <div className="screen-frame relative touch-none" style={{ width: box.w, height: box.h }}>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [ui, setUi] = useState<UIState>(initialUI);
  const { touch, landscape } = useHandheld();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, setUi);
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const press = (a: string) => engineRef.current?.press(a);
  const inWorld = ui.screen === "world";
  const showHud = inWorld && !ui.encounter && ui.victory === null;

  const canvas = (
    <canvas
      ref={canvasRef}
      onClick={() => press("primary")}
      className="w-full h-full cursor-pointer touch-none"
      aria-label="Aves del Odiel — mundo del juego"
    />
  );

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-marsh-950 select-none scanlines crt-vignette"
      onContextMenu={(e) => e.preventDefault()}
    >
      {touch ? (
        /* ── Modo consola portátil: pantalla arriba, mandos abajo (o a la derecha) ── */
        <div className={`h-full flex ${landscape ? "flex-row" : "flex-col"}`}>
          <div className="relative flex-1 min-w-0 min-h-0 bg-marsh-900">
            <Frame>
              {canvas}
              {showHud && <HUD ui={ui} press={press} touch />}
            </Frame>
          </div>
          {inWorld && <TouchDeck ui={ui} press={press} landscape={landscape} />}
        </div>
      ) : (
        /* ── Modo escritorio: pantalla 16:9; con encuentro, pantalla arriba y panel abajo ── */
        <div className={`h-full w-full flex ${ui.encounter || ui.dialog ? "flex-col" : "items-center justify-center"}`}>
          <div
            className="relative"
            style={
              ui.encounter || ui.dialog
                ? {
                    width: "min(100vw, calc(62vh * 16 / 9))",
                    height: "min(62vh, calc(100vw * 9 / 16))",
                    margin: "0 auto",
                    flexShrink: 0,
                  }
                : {
                    width: "min(100vw, calc(100vh * 16 / 9))",
                    height: "min(100vh, calc(100vw * 9 / 16))",
                  }
            }
          >
            {canvas}
            {showHud && <HUD ui={ui} press={press} />}
          </div>
          {ui.encounter && (
            <div className="w-full max-w-3xl mx-auto px-2 pb-2 shrink min-h-0 overflow-y-auto scroll-pixel">
              <EncounterPanel ui={ui} press={press} />
            </div>
          )}
          {ui.dialog && (
            <div className="w-full max-w-3xl mx-auto px-2 pb-2 shrink min-h-0 overflow-y-auto scroll-pixel">
              <DialogBox ui={ui} press={press} />
            </div>
          )}
        </div>
      )}

      {/* ── Overlays globales ── */}
      {ui.screen === "title" && <TitleScreen ui={ui} press={press} />}
      {ui.screen === "intro" && <IntroOverlay ui={ui} press={press} />}
      {ui.guideOpen && <GuideOverlay ui={ui} press={press} />}
      <PauseOverlay ui={ui} press={press} />
      {ui.screen === "victory" && <VictoryOverlay ui={ui} press={press} />}
    </div>
  );
}
