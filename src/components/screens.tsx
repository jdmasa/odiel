import { useEffect, useRef, useState, type ReactNode } from "react";
import type { UIState } from "../game/engine";
import {
  BIRDS, RARITY_LABEL, RARITY_COLOR, PHOTO_LABEL,
  type Sprite, type Bird,
} from "../game/birds";

type Press = (a: string) => void;

// ─── Iconos SVG ──────────────────────────────────────────────────────────────
const ic = "inline-block align-[-2px]";
export const IconBinoculars = ({ s = 16 }: { s?: number }) => (
  <svg className={ic} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <circle cx="6.5" cy="15.5" r="4.5" /><circle cx="17.5" cy="15.5" r="4.5" />
    <path d="M9.5 13.5V7a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v6.5" />
  </svg>
);
export const IconCamera = ({ s = 16 }: { s?: number }) => (
  <svg className={ic} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M3 8h4l2-3h6l2 3h4v12H3z" /><circle cx="12" cy="13" r="4" />
  </svg>
);
export const IconBook = ({ s = 16 }: { s?: number }) => (
  <svg className={ic} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M12 5c-2-2-6-2-9-1v15c3-1 7-1 9 1 2-2 6-2 9-1V4c-3-1-7-1-9 1z" /><path d="M12 5v15" />
  </svg>
);
export const IconSeed = ({ s = 16 }: { s?: number }) => (
  <svg className={ic} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M12 21V9" /><path d="M12 9C12 5 9 3 5 3c0 4 3 6 7 6z" /><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z" />
  </svg>
);
export const IconRun = ({ s = 16 }: { s?: number }) => (
  <svg className={ic} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <circle cx="14" cy="4.5" r="2" /><path d="M10 20l3-5-2-4 4-2 3 3" /><path d="M8 12l2-3 3 2-2 4" />
  </svg>
);
export const IconFeather = ({ s = 16, off = false }: { s?: number; off?: boolean }) => (
  <svg className={ic} width={s} height={s} viewBox="0 0 24 24"
    fill={off ? "none" : "currentColor"} stroke="currentColor" strokeWidth="1.8" opacity={off ? 0.35 : 1}>
    <path d="M20 4c-8 0-13 5-15 13l-1 3 3-1c8-2 13-7 13-15z" /><path d="M5 19L15 9" fill="none" />
  </svg>
);
export const IconSound = ({ s = 16, muted = false }: { s?: number; muted?: boolean }) => (
  <svg className={ic} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M4 9v6h4l5 4V5L8 9H4z" />
    {muted ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M16 9c1.5 1.5 1.5 4.5 0 6M18.5 6.5c3 3 3 8 0 11" />}
  </svg>
);
export const IconPause = ({ s = 16 }: { s?: number }) => (
  <svg className={ic} width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
  </svg>
);
export const IconSun = ({ s = 14 }: { s?: number }) => (
  <svg className={ic} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2" />
  </svg>
);
export const IconMoon = ({ s = 14 }: { s?: number }) => (
  <svg className={ic} width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
  </svg>
);

// ─── Sprite en canvas ───────────────────────────────────────────────────────
export function SpriteImg({ sprite, scale = 4, silhouette = false, className = "" }: {
  sprite: Sprite; scale?: number; silhouette?: boolean; className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = 16; c.height = 16;
    const g = c.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, 16, 16);
    sprite.px.forEach((row, y) => {
      for (let x = 0; x < 16; x++) {
        const ch = row[x];
        if (!ch || ch === ".") continue;
        const col = silhouette ? "#0f2b21" : sprite.pal[ch];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    });
  }, [sprite, silhouette]);
  return (
    <canvas ref={ref} className={className}
      style={{ width: 16 * scale, height: 16 * scale, imageRendering: "pixelated" }} />
  );
}

// ─── Título ─────────────────────────────────────────────────────────────────
export function TitleScreen({ ui, press }: { ui: UIState; press: Press }) {
  return (
    <div className="absolute inset-0 z-30 overflow-y-auto scroll-pixel text-center">
      <div className="min-h-full flex flex-col items-center justify-center gap-5 px-4 py-6">
        <div className="anim-fadeup">
          <div className="font-pixel text-[9px] tracking-widest text-aqua px-shadow">PARAJE NATURAL · HUELVA</div>
          <h1 className="font-pixel px-shadow-lg mt-3 text-3xl sm:text-5xl leading-tight text-cream">
            AVES<span className="text-amber"> DEL </span>ODIEL
          </h1>
          <p className="mt-3 font-body font-bold text-sm sm:text-base text-cream/85">
            Un RPG ornitológico en las Marismas del Odiel
          </p>
        </div>

        <div className="flex items-center gap-3 anim-fadeup" style={{ animationDelay: "120ms" }}>
          {BIRDS.slice(0, 5).map((b, i) => (
            <div key={b.id} className="anim-bob" style={{ animationDelay: `${i * 0.3}s` }}>
              <SpriteImg sprite={b.sprite} scale={2.5} />
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2.5 anim-fadeup" style={{ animationDelay: "220ms" }}>
          <button className="pixel-btn anim-glow bg-amber text-marsh-950 px-6 py-3.5 text-[11px]"
            onClick={() => press("start")}>
            NUEVA PARTIDA
          </button>
          {ui.hasSave && (
            <button className="pixel-btn bg-marsh-700 text-cream px-6 py-3 text-[10px]"
              onClick={() => press("continue")}>
              CONTINUAR AVISTAMIENTO
            </button>
          )}
        </div>

        <div className="pixel-panel-deep px-4 py-3 text-left text-[10px] sm:text-[11px] font-body font-bold text-cream/80 anim-fadeup"
          style={{ animationDelay: "320ms" }}>
          <div className="font-pixel text-[8px] text-amber mb-2 tracking-wider">CÓMO SE JUEGA</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            <span><kbd className="font-pixel text-[8px] text-aqua">WASD · Flechas</kbd> — caminar por la marisma</span>
            <span><kbd className="font-pixel text-[8px] text-aqua">E</kbd> — leer carteles y observatorios</span>
            <span><kbd className="font-pixel text-[8px] text-aqua">1-4</kbd> — acciones en el encuentro</span>
            <span><kbd className="font-pixel text-[8px] text-aqua">ESPACIO</kbd> — disparar la cámara</span>
            <span><kbd className="font-pixel text-[8px] text-aqua">G</kbd> — guía de aves</span>
            <span><kbd className="font-pixel text-[8px] text-aqua">M</kbd> — silenciar</span>
          </div>
          <div className="mt-2 text-cream/60 font-semibold text-[10px]">
            Atraviesa carrizales y fangales para encontrar aves. Fotografía las {BIRDS.length} especies para completar la guía.
          </div>
        </div>

        <div className="font-pixel text-[8px] text-cream/50 anim-blink">PULSA ENTER PARA EMPEZAR</div>
      </div>
    </div>
  );
}

// ─── Introducción con máquina de escribir ───────────────────────────────────
export function IntroOverlay({ ui, press }: { ui: UIState; press: Press }) {
  const texts = [
    "Marismas del Odiel, Huelva. Siete de la mañana: la marea baja deja al descubierto kilómetros de fangal brillante y caños plateados.",
    "Eres Anna, ornitóloga aficionada. Hoy empiezas tu reto: completar la guía de campo con las 20 aves del paraje. Observa, aprende... y consigue la foto perfecta.",
    "Camina por carrizales, fangales y pasarelas para encontrar aves. Algunas especies solo aparecen al amanecer, al atardecer o de noche. El observatorio repone tus cebos y da pistas.",
  ];
  const full = texts[ui.introStep] ?? "";
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const iv = window.setInterval(() => setN((v) => Math.min(full.length, v + 2)), 24);
    return () => window.clearInterval(iv);
  }, [full]);
  const done = n >= full.length;

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center p-4 sm:p-8" onClick={() => (done ? press("intro-next") : setN(full.length))}>
      <div className="pixel-panel w-full max-w-2xl px-5 py-4 cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <span className="font-pixel text-[8px] tracking-widest text-amber">CUADERNO DE CAMPO · ANNA</span>
          <div className="flex gap-1.5">
            {texts.map((_, i) => (
              <span key={i} className={`h-1.5 w-4 ${i <= ui.introStep ? "bg-amber" : "bg-marsh-600"}`} />
            ))}
          </div>
        </div>
        <p className={`font-body font-bold text-sm sm:text-base leading-relaxed text-cream min-h-[72px] ${done ? "" : "typecaret"}`}>
          {full.slice(0, n)}
        </p>
        <div className="mt-2 text-right font-pixel text-[8px] text-cream/50">
          {done ? (ui.introStep < ui.introTotal - 1 ? "CLIC / ENTER · SEGUIR" : "CLIC / ENTER · ¡A LA MARISMA!") : "CLIC · SALTAR"}
        </div>
      </div>
    </div>
  );
}

// ─── HUD ────────────────────────────────────────────────────────────────────
export function HUD({ ui, press, touch = false }: { ui: UIState; press: Press; touch?: boolean }) {
  const h = ui.hud;
  const night = h.phaseName === "Noche";
  const stat = (label: string, value: ReactNode, color: string) => (
    <div>
      <div className={`font-pixel text-cream/60 ${touch ? "text-[6px]" : "text-[8px]"}`}>{label}</div>
      <div className={`font-pixel px-shadow ${color} ${touch ? "text-[10px]" : "text-[13px]"}`}>{value}</div>
    </div>
  );
  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none">
      {/* fila superior */}
      <div className={`absolute left-2 right-2 flex items-start justify-between gap-2 ${touch ? "top-1.5" : "top-2"}`}>
        <div className={`pixel-panel flex items-center ${touch ? "px-2 py-1.5 gap-2" : "px-3 py-2 gap-3"}`}>
          {stat("PUNTOS", h.score, "text-amber")}
          <div className={`w-px bg-line ${touch ? "h-6" : "h-8"}`} />
          {stat("GUÍA", <>{h.photos}<span className="text-cream/50 text-[8px]">/{h.total}</span></>, "text-aqua")}
          <div className={`w-px bg-line ${touch ? "h-6" : "h-8"}`} />
          {stat("CEBOS", h.cebos, "text-leaf")}
        </div>

        <div className="flex items-start gap-2">
          <div className={`pixel-panel text-right ${touch ? "px-2 py-1.5" : "px-3 py-2"}`}>
            <div className={`flex items-center justify-end gap-1.5 font-pixel text-cream px-shadow ${touch ? "text-[9px]" : "text-[11px]"}`}>
              <span className={night || h.phaseName === "Atardecer" ? "text-lilac" : "text-amber"}>
                {night ? <IconMoon /> : <IconSun />}
              </span>
              {h.clock}
            </div>
            <div className={`font-body font-bold text-cream/70 leading-tight ${touch ? "text-[9px]" : "text-[11px]"}`}>
              {h.phaseName}
            </div>
          </div>
          {!touch && (
            <div className="flex flex-col gap-1.5 pointer-events-auto">
              <button className="pixel-btn bg-marsh-700 text-cream px-2 py-2" title="Guía de aves (G)" onClick={() => press("guide")}>
                <IconBook />
              </button>
              <button className="pixel-btn bg-marsh-700 text-cream px-2 py-2" title="Silenciar (M)" onClick={() => press("mute")}>
                <IconSound muted={ui.muted} />
              </button>
              <button className="pixel-btn bg-marsh-700 text-cream px-2 py-2" title="Pausa (Esc)" onClick={() => press("pause")}>
                <IconPause />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* pista contextual (oculta mientras se lee un diálogo) */}
      {!ui.dialog && (
        <div className={`absolute left-1/2 -translate-x-1/2 w-max max-w-[94%] ${touch ? "bottom-1.5" : "bottom-2"}`}>
          <div key={h.hint} className={`anim-hint pixel-panel-deep px-3 py-1 font-body font-bold text-center ${touch ? "text-[10px]" : "py-1.5 text-[12px]"} text-cream/80`}>
            {h.hint}
          </div>
        </div>
      )}

      {/* toasts */}
      <div className={`absolute left-2 flex flex-col gap-1.5 max-w-[75%] ${touch ? "bottom-8" : "bottom-12"}`}>
        {ui.toasts.map((t) => (
          <div key={t.id}
            className={`anim-toast pixel-panel px-3 py-1.5 font-body font-bold ${touch ? "text-[10px]" : "text-[12px]"} ${
              t.kind === "rare" ? "text-amber" : t.kind === "good" ? "text-leaf" : t.kind === "warn" ? "text-coral" : "text-cream/85"
            }`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Panel de encuentro ─────────────────────────────────────────────────────
export function EncounterPanel({ ui, press, docked = false }: { ui: UIState; press: Press; docked?: boolean }) {
  const e = ui.encounter;
  if (!e) return null;
  const bird = BIRDS.find((b) => b.id === e.birdId)!;
  const displayName = e.known ? e.name : "¿?¿? ¿Ave desconocida?";

  const btn = `pixel-btn flex items-center justify-center gap-2 px-3 leading-relaxed ${
    docked ? "py-3.5 text-[9px]" : "py-3 text-[9px] sm:text-[10px]"
  }`;

  return (
    <div className={docked ? "" : "z-30"}>
      <div className={`pixel-panel ${docked ? "px-3 py-2.5" : "px-4 py-3"}`}>
        {/* cabecera */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
          <span className="font-pixel text-[11px] sm:text-[13px] text-cream px-shadow">{displayName}</span>
          {e.known && (
            <>
              <span className="font-body italic font-semibold text-[12px] text-cream/55">{e.sci}</span>
              <span className="font-pixel text-[7px] px-2 py-1 border-2 border-line"
                style={{ color: RARITY_COLOR[bird.rarity], background: "rgba(0,0,0,0.3)" }}>
                {RARITY_LABEL[bird.rarity]}
              </span>
            </>
          )}
          <span className="ml-auto flex items-center gap-0.5 text-coral" title="Desconfianza del ave">
            {Array.from({ length: e.maxAlerta }).map((_, i) => (
              <IconFeather key={i} s={15} off={i >= e.alerta} />
            ))}
          </span>
        </div>

        {/* texto */}
        <div className={`pixel-panel-deep px-3 flex items-center ${docked ? "py-1.5 min-h-[42px]" : "py-2 min-h-[52px]"}`}>
          <p className={`font-body font-bold leading-snug text-cream/90 ${docked ? "text-[12px]" : "text-[13px] sm:text-sm"}`}>
            {e.mode === "huida" ? "El ave levanta el vuelo y se pierde sobre la marisma..." : e.text}
            {(e.mode === "texto" || e.mode === "resultado") && <span className="anim-blink text-amber"> ▸</span>}
          </p>
        </div>

        {/* acciones */}
        <div className="mt-2">
          {e.mode === "menu" && (
            <div className={`grid gap-2 ${docked ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
              <button className={`${btn} bg-aqua text-marsh-950`} onClick={() => press("observar")}>
                <IconBinoculars /> OBSERVAR {!docked && <kbd className="font-pixel text-[7px] opacity-60">1</kbd>}
              </button>
              <button className={`${btn} bg-amber text-marsh-950`} onClick={() => press("foto")}>
                <IconCamera /> FOTOGRAFIAR {!docked && <kbd className="font-pixel text-[7px] opacity-60">2</kbd>}
              </button>
              <button className={`${btn} ${e.canCebo ? "bg-leaf text-marsh-950" : "bg-marsh-700 text-cream/40"}`}
                disabled={!e.canCebo} onClick={() => press("cebo")}>
                <IconSeed /> CEBO ({ui.hud.cebos}) {!docked && <kbd className="font-pixel text-[7px] opacity-60">3</kbd>}
              </button>
              <button className={`${btn} bg-marsh-700 text-cream`} onClick={() => press("marcharse")}>
                <IconRun /> MARCHARSE {!docked && <kbd className="font-pixel text-[7px] opacity-60">4</kbd>}
              </button>
            </div>
          )}
          {e.mode === "texto" && (
            <div className={`flex ${docked ? "" : "justify-end"}`}>
              <button className={`${btn} bg-amber text-marsh-950 px-5 ${docked ? "flex-1" : ""}`} onClick={() => press("primary")}>
                SEGUIR {!docked && <kbd className="font-pixel text-[7px] opacity-60">ESPACIO</kbd>}
              </button>
            </div>
          )}
          {e.mode === "foto" && (
            <div className={`flex items-center gap-3 ${docked ? "flex-col" : "justify-between"}`}>
              <span className={`font-pixel text-[7px] text-cream/60 ${docked ? "" : "hidden sm:block"}`}>APUNTA AL CENTRO PARA UNA FOTO PERFECTA</span>
              <button className={`${btn} bg-coral text-cream px-6 py-4 anim-glow ${docked ? "w-full text-[11px]" : ""}`} onClick={() => press("primary")}>
                <IconCamera /> ¡DISPARAR! {!docked && <kbd className="font-pixel text-[7px] opacity-70">ESPACIO</kbd>}
              </button>
            </div>
          )}
          {e.mode === "resultado" && e.resultado && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-pixel text-[10px] text-cream">
                  <span className="text-amber">{PHOTO_LABEL[e.resultado.quality].toUpperCase()}</span>
                  {e.resultado.quality === 3 && <span className="text-coral"> ★</span>}
                </span>
                <span className="font-pixel text-[10px] text-leaf">+{e.resultado.points}</span>
                {e.resultado.newSpecies && (
                  <span className="font-pixel text-[8px] bg-flame/20 text-flame border-2 border-flame/50 px-2 py-1">¡NUEVA EN LA GUÍA!</span>
                )}
              </div>
              <button className={`${btn} bg-amber text-marsh-950 px-5 ${docked ? "w-full" : ""}`} onClick={() => press("primary")}>
                CONTINUAR {!docked && <kbd className="font-pixel text-[7px] opacity-60">ESPACIO</kbd>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Guía de campo ──────────────────────────────────────────────────────────
export function GuideOverlay({ ui, press }: { ui: UIState; press: Press }) {
  const g = ui.guide;
  const photos = BIRDS.filter((b) => g[b.id]?.photo > 0).length;
  return (
    <div className="absolute inset-0 z-40 bg-marsh-950/88 flex items-stretch sm:items-center justify-center sm:p-4">
      <div className="pixel-panel w-full sm:max-w-4xl sm:max-h-full flex flex-col anim-pop">
        <div className="flex items-center gap-3 px-4 py-3 border-b-3 border-line">
          <span className="text-amber"><IconBook s={20} /></span>
          <div>
            <h2 className="font-pixel text-[11px] sm:text-sm text-cream px-shadow">GUÍA DE CAMPO DEL ODIEL</h2>
            <p className="font-body font-bold text-[12px] text-cream/60">
              {photos} de {BIRDS.length} especies fotografiadas · {ui.hud.seen} avistadas
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block h-2.5 w-28 lg:w-44 bg-marsh-900 border-2 border-line">
              <div className="h-full bg-amber transition-all duration-500" style={{ width: `${(photos / BIRDS.length) * 100}%` }} />
            </div>
            <button className="pixel-btn bg-coral text-cream px-3 py-2 font-pixel text-[9px]" onClick={() => press("guide")}>
              ✕ CERRAR
            </button>
          </div>
        </div>

        <div className="scroll-pixel overflow-y-auto p-3 sm:p-4">
          <div className="h-2 sm:hidden mb-2 bg-marsh-900 border-2 border-line">
            <div className="h-full bg-amber transition-all duration-500" style={{ width: `${(photos / BIRDS.length) * 100}%` }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {BIRDS.map((b) => <GuideCard key={b.id} bird={b} seen={g[b.id]?.seen ?? false} photo={g[b.id]?.photo ?? 0} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function GuideCard({ bird, seen, photo }: { bird: Bird; seen: boolean; photo: 0 | 1 | 2 | 3 }) {
  const known = seen || photo > 0;
  return (
    <div className={`pixel-panel-deep flex gap-3 p-2.5 ${known ? "" : "opacity-80"}`}>
      <div className={`shrink-0 w-[72px] h-[72px] flex items-center justify-center border-2 border-line ${known ? "bg-marsh-900" : "bg-marsh-950"}`}>
        <SpriteImg sprite={bird.sprite} scale={4.5} silhouette={!known} />
      </div>
      <div className="min-w-0 flex-1">
        {known ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-pixel text-[11px] sm:text-[10px] text-cream">{bird.name}</span>
              <span className="font-pixel text-[7px] px-1.5 py-0.5 border-2 border-line"
                style={{ color: RARITY_COLOR[bird.rarity] }}>
                {RARITY_LABEL[bird.rarity]}
              </span>
              {photo > 0 && (
                <span className="font-pixel text-[8px] text-amber">
                  {"★".repeat(photo)}<span className="text-cream/25">{"★".repeat(3 - photo)}</span>
                </span>
              )}
            </div>
            <div className="font-body italic font-semibold text-[12px] sm:text-[11px] text-cream/50">{bird.sci} · {bird.family}</div>
            <p className="font-body font-semibold text-[13px] sm:text-[12px] leading-snug text-cream/85 mt-1 line-clamp-4 sm:line-clamp-3">{bird.desc}</p>
            {bird.fact && (
              <p className="flex items-start gap-1.5 mt-1 font-body font-semibold text-[12px] sm:text-[11px] leading-snug text-amber/90">
                <span className="mt-[2px] shrink-0"><IconFeather s={12} /></span>
                <span className="line-clamp-3 sm:line-clamp-2">{bird.fact}</span>
              </p>
            )}
            <div className="mt-1 font-body font-bold text-[11px] sm:text-[10px] text-aqua/80">
              {bird.size} · {bird.zones.join(" y ")}
            </div>
          </>
        ) : (
          <>
            <span className="font-pixel text-[11px] sm:text-[10px] text-cream/40">ESPECIE SIN AVISTAR</span>
            <p className="font-body font-bold text-[13px] sm:text-[12px] text-cream/45 mt-1 leading-snug">
              Explora {bird.zones.map((z) => ({ carrizal: "el carrizal", fangal: "el fangal y la playa", matorral: "el matorral", agua: "las pasarelas y la ría" })[z]).join(" y ")}
              {bird.time.day < 0.2 ? " de noche." : bird.time.dawn >= 2 ? " al amanecer." : bird.time.dusk >= 1.5 ? " al atardecer." : "."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Diálogo, pausa y victoria ──────────────────────────────────────────────
export function DialogBox({ ui, press, docked = false }: { ui: UIState; press: Press; docked?: boolean }) {
  if (!ui.dialog) return null;
  return (
    <div className={docked ? "" : "z-40"} onClick={() => press("primary")}>
      <div className={`pixel-panel cursor-pointer anim-fadeup ${docked ? "px-3 py-2.5" : "px-4 py-3"}`}>
        <div className="font-pixel text-[9px] text-amber mb-1.5 tracking-wide">{ui.dialog.title.toUpperCase()}</div>
        <p className={`font-body font-bold leading-snug text-cream/90 ${docked ? "text-[12px]" : "text-[13px] sm:text-sm"}`}>{ui.dialog.text}</p>
        <div className="mt-1.5 text-right font-pixel text-[8px] text-cream/50 anim-blink">
          {docked ? "TOCA PARA CERRAR" : "E / ENTER · CERRAR"}
        </div>
      </div>
    </div>
  );
}

export function PauseOverlay({ ui, press }: { ui: UIState; press: Press }) {
  if (!ui.paused) return null;
  return (
    <div className="absolute inset-0 z-40 bg-marsh-950/85 flex items-center justify-center p-4">
      <div className="pixel-panel px-6 py-5 w-full max-w-sm anim-pop">
        <h2 className="font-pixel text-[13px] text-cream px-shadow mb-4">PAUSA</h2>
        <div className="flex flex-col gap-2">
          <button className="pixel-btn bg-amber text-marsh-950 px-4 py-3 text-[10px]" onClick={() => press("pause")}>SEGUIR EXPLORANDO</button>
          <button className="pixel-btn bg-marsh-700 text-cream px-4 py-3 text-[10px]" onClick={() => press("guide")}>GUÍA DE AVES ({ui.hud.photos}/{ui.hud.total})</button>
          <button className="pixel-btn bg-marsh-700 text-cream px-4 py-3 text-[10px]" onClick={() => press("mute")}>
            SONIDO: {ui.muted ? "APAGADO" : "ENCENDIDO"}
          </button>
          <button className="pixel-btn bg-coral/80 text-cream px-4 py-3 text-[10px]" onClick={() => press("restart")}>REINICIAR PARTIDA</button>
        </div>
        <p className="mt-3 font-body font-semibold text-[11px] text-cream/50">
          El progreso se guarda en cada avistamiento y en los observatorios.
        </p>
      </div>
    </div>
  );
}

const FEATHER_COLORS = ["#ff9fb6", "#ffb43a", "#56c9bd", "#f2ead4", "#93d48c"];
export function VictoryOverlay({ ui, press }: { ui: UIState; press: Press }) {
  const v = ui.victory;
  if (!v) return null;
  return (
    <div className="absolute inset-0 z-40 bg-marsh-950/80 overflow-hidden">
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} className="feather" style={{
          left: `${(i * 61) % 100}%`,
          animationDuration: `${4 + (i % 5)}s`,
          animationDelay: `${(i * 0.55) % 4}s`,
          color: FEATHER_COLORS[i % FEATHER_COLORS.length],
        }}>
          <IconFeather s={14 + (i % 3) * 6} />
        </div>
      ))}
      <div className="absolute inset-0 overflow-y-auto scroll-pixel flex p-4">
        <div className="pixel-panel px-6 py-6 text-center max-w-md w-full anim-pop relative my-auto mx-auto">
          <div className="font-pixel text-[9px] text-aqua tracking-widest">GUÍA DE CAMPO COMPLETA</div>
          <h2 className="font-pixel text-xl sm:text-2xl text-amber px-shadow-lg mt-3 leading-relaxed">¡{v.rank.toUpperCase()}!</h2>
          <div className="flex justify-center gap-2 mt-3">
            {BIRDS.slice(0, 7).map((b, i) => (
              <div key={b.id} className="anim-bob" style={{ animationDelay: `${i * 0.22}s` }}>
                <SpriteImg sprite={b.sprite} scale={2.2} />
              </div>
            ))}
          </div>
          <p className="font-body font-bold text-sm text-cream/85 mt-3">
            Has fotografiado las {v.photos} especies de las Marismas del Odiel. Anna cierra el cuaderno de campo: la ría ya es parte de ti.
          </p>
          <div className="mt-3 font-pixel text-[12px] text-leaf">PUNTUACIÓN FINAL: {v.score}</div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-5">
            <button className="pixel-btn bg-amber text-marsh-950 px-5 py-3 text-[10px]" onClick={() => press("keep-playing")}>SEGUIR EXPLORANDO</button>
            <button className="pixel-btn bg-marsh-700 text-cream px-5 py-3 text-[10px]" onClick={() => press("restart")}>NUEVA PARTIDA</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mando de consola portátil (táctil) ─────────────────────────────────────
const hold = (key: string) => ({
  onPointerDown: (ev: React.PointerEvent) => {
    ev.preventDefault();
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
    window.dispatchEvent(new KeyboardEvent("keydown", { key }));
  },
  onPointerUp: () => window.dispatchEvent(new KeyboardEvent("keyup", { key })),
  onPointerLeave: () => window.dispatchEvent(new KeyboardEvent("keyup", { key })),
  onPointerCancel: () => window.dispatchEvent(new KeyboardEvent("keyup", { key })),
});

const Chev = ({ rot }: { rot: number }) => (
  <svg width="15" height="15" viewBox="0 0 14 14" style={{ transform: `rotate(${rot}deg)` }} fill="currentColor">
    <path d="M7 3l5 7H2z" />
  </svg>
);

function DPad() {
  const cell = "h-[clamp(38px,12vmin,52px)] w-[clamp(38px,12vmin,52px)]";
  return (
    <div className="grid grid-cols-3 grid-rows-3 shrink-0" style={{ width: "clamp(114px, 36vmin, 156px)", height: "clamp(114px, 36vmin, 156px)" }}>
      <span />
      <button className={`dpad-btn ${cell} rounded-t-lg`} {...hold("ArrowUp")} aria-label="Arriba"><Chev rot={0} /></button>
      <span />
      <button className={`dpad-btn ${cell} rounded-l-lg`} {...hold("ArrowLeft")} aria-label="Izquierda"><Chev rot={270} /></button>
      <div className={`${cell} bg-[#1c4a3c] border-2 border-line flex items-center justify-center`}>
        <span className="h-3.5 w-3.5 bg-[#0f332a] border-2 border-line rotate-45" />
      </div>
      <button className={`dpad-btn ${cell} rounded-r-lg`} {...hold("ArrowRight")} aria-label="Derecha"><Chev rot={90} /></button>
      <span />
      <button className={`dpad-btn ${cell} rounded-b-lg`} {...hold("ArrowDown")} aria-label="Abajo"><Chev rot={180} /></button>
      <span />
    </div>
  );
}

function ABCluster({ press }: { press: Press }) {
  return (
    <div className="relative shrink-0" style={{ width: "clamp(96px, 30vmin, 150px)", height: "clamp(86px, 27vmin, 128px)" }}>
      <div className="absolute left-0 bottom-3 flex flex-col items-center gap-0.5">
        <button className="ab-btn bg-aqua text-marsh-950 text-[13px] h-[clamp(38px,12vmin,58px)] w-[clamp(38px,12vmin,58px)]" onClick={() => press("guide")} aria-label="Botón B: guía de aves">B</button>
        <span className="font-pixel text-[6px] text-cream/45 tracking-wider">GUÍA</span>
      </div>
      <div className="absolute right-0 top-0 flex flex-col items-center gap-0.5">
        <button className="ab-btn bg-coral text-cream text-[15px] h-[clamp(46px,15vmin,70px)] w-[clamp(46px,15vmin,70px)]" onClick={() => press("primary")} aria-label="Botón A: aceptar">A</button>
        <span className="font-pixel text-[6px] text-cream/45 tracking-wider">OK · FOTO</span>
      </div>
    </div>
  );
}

function MiniBtns({ ui, press, horizontal = false }: { ui: UIState; press: Press; horizontal?: boolean }) {
  const b = "pixel-btn bg-[#0f332a] text-cream/80 px-2 py-2 text-[7px] flex items-center justify-center gap-1";
  return (
    <div className={`flex shrink-0 gap-1.5 ${horizontal ? "flex-row" : "flex-col"}`}>
      <button className={b} onClick={() => press("guide")} aria-label="Guía de aves"><IconBook s={11} /><span className="hidden landscape:inline">GUÍA</span></button>
      <button className={b} onClick={() => press("mute")} aria-label="Silenciar"><IconSound s={11} muted={ui.muted} /></button>
      <button className={b} onClick={() => press("pause")} aria-label="Pausa"><IconPause s={11} /></button>
    </div>
  );
}

export function TouchDeck({ ui, press, landscape }: { ui: UIState; press: Press; landscape: boolean }) {
  const busy = !!(ui.encounter || ui.dialog);
  return (
    <div
      className={`relative z-30 shrink-0 deck-bg border-line touch-none flex flex-col ${
        landscape ? "w-[46%] max-w-[360px] border-l-4" : `w-full border-t-4 ${busy ? "deck-h-busy" : "deck-h"}`
      }`}
    >
      {/* franja superior del mando */}
      <div className="flex items-center justify-between px-3 h-7 shrink-0 bg-marsh-900/85 border-b-2 border-line/70">
        <span className="font-pixel text-[7px] tracking-[0.22em] text-cream/45">
          {busy ? "CUADERNO DE CAMPO" : "AVES DEL ODIEL · GM-20"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-coral shadow-[0_0_7px_rgba(255,111,94,0.9)]" />
          <span className="h-2 w-2 rounded-full bg-marsh-600" />
        </span>
      </div>

      {busy ? (
        /* encuentro o diálogo: acoplado al mando, nunca sobre el mapa */
        <div className="flex-1 min-h-0 overflow-y-auto scroll-pixel p-2 pb-safe">
          {ui.encounter
            ? <EncounterPanel ui={ui} press={press} docked />
            : <DialogBox ui={ui} press={press} docked />}
        </div>
      ) : (
        <div className={`flex-1 min-h-0 min-w-0 flex items-center justify-between gap-2 px-3 pb-safe ${landscape ? "flex-col py-2" : ""}`}>
          <DPad />
          <MiniBtns ui={ui} press={press} horizontal={landscape} />
          <ABCluster press={press} />
        </div>
      )}
    </div>
  );
}
