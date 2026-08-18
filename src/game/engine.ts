import { ANNA, BIRDS, PHOTO_BONUS, PHOTO_LABEL, SIGHT_POINTS, type Bird, type Phase, type Sprite } from "./birds";
import { SFX } from "./audio";
import {
  MAP, MAP_W, MAP_H, SPAWN, SIGNS, GENERIC_SIGN, FLAMINGOS, ENCOUNTERS,
  isBlocking, zoneOf, zoneNameAt, ZONE_FLAVOR, type Zone,
} from "./world";

export const VIEW_W = 480;
export const VIEW_H = 270;
const TILE = 16;
const DAY_LEN = 180; // segundos reales por día completo
const START_HOUR = 7;
const MOVE_TIME = 0.16;
const MAX_ALERTA = 5;
const SAVE_KEY = "aves-odiel-v1";

export interface GuideEntry { seen: boolean; photo: 0 | 1 | 2 | 3; }
export type EncMode = "menu" | "texto" | "foto" | "resultado" | "huida";
export interface EncounterUI {
  birdId: string; name: string; sci: string; known: boolean;
  alerta: number; maxAlerta: number; mode: EncMode; text: string;
  resultado: { quality: 1 | 2 | 3; points: number; newSpecies: boolean } | null;
  canCebo: boolean;
}
export interface UIState {
  screen: "title" | "intro" | "world" | "victory";
  introStep: number; introTotal: number;
  paused: boolean; muted: boolean; guideOpen: boolean; hasSave: boolean;
  dialog: { title: string; text: string } | null;
  hud: {
    score: number; seen: number; photos: number; total: number;
    clock: string; phaseName: string; zone: string; cebos: number; hint: string;
  };
  encounter: EncounterUI | null;
  guide: Record<string, GuideEntry>;
  victory: { score: number; photos: number; rank: string } | null;
  toasts: { id: number; text: string; kind: "info" | "good" | "warn" | "rare" }[];
}

interface Enc {
  birdId: string; bird: Bird; name: string; sci: string; known: boolean;
  alerta: number; maxAlerta: number; mode: EncMode; text: string;
  resultado: { quality: 1 | 2 | 3; points: number; newSpecies: boolean } | null;
  usedCebo: boolean; calm: boolean;
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; grav: number; }
interface Flyer { x: number; y: number; v: number; ph: number; }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const RARITY_W = [10, 6, 3, 1.2];

const SKIES: Record<Phase, string[]> = {
  dawn: ["#2b2450", "#7a4a78", "#e08a5a", "#ffc488"],
  day: ["#4a90c8", "#6ab0d8", "#9fd0e0", "#c8e8ec"],
  dusk: ["#33244f", "#8a3a60", "#e06a4a", "#ffb070"],
  night: ["#060a18", "#0d1530", "#16203f", "#1d2a4d"],
};
const TINT: Record<Phase, [string, number]> = {
  dawn: ["#ff9f6f", 0.1],
  day: ["#ffffff", 0],
  dusk: ["#ff6f5e", 0.16],
  night: ["#0a1a3f", 0.42],
};

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private setUI: (s: UIState) => void;
  private sfx = new SFX();
  private raf = 0;
  private lastT = 0;
  private time = 0;
  private toastId = 1;
  private spriteCache = new WeakMap<Sprite, HTMLCanvasElement>();

  screen: "title" | "intro" | "world" | "victory" = "title";
  private introStep = 0;
  private paused = false;
  private guideOpen = false;
  hasSave = false;

  private px = SPAWN[0]; private py = SPAWN[1];
  private tx = SPAWN[0]; private ty = SPAWN[1];
  private dir: "up" | "down" | "left" | "right" = "down";
  private moving = false; private moveT = 0; private walkT = 0;
  private keys: string[] = [];
  private cooldown = 0; private stepAcc = 0;

  private dayT = 0; private lastPhase: Phase = "dawn"; private lastZone = "";
  private score = 0; private cebos = 3;
  private guide: Record<string, GuideEntry> = {};

  private enc: Enc | null = null;
  private photoT = 0; private fleeT = 0;
  private dialog: { title: string; text: string } | null = null;
  private victory: { score: number; photos: number; rank: string } | null = null;
  private pendingVictory = 0;

  private particles: Particle[] = [];
  private flyers: Flyer[] = [];
  private flash = 0; private shake = 0;
  private toasts: { id: number; text: string; kind: "info" | "good" | "warn" | "rare"; exp: number }[] = [];

  constructor(canvas: HTMLCanvasElement, setUI: (s: UIState) => void) {
    this.canvas = canvas;
    this.setUI = setUI;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
    for (const b of BIRDS) this.guide[b.id] = { seen: false, photo: 0 };
    try { this.hasSave = !!localStorage.getItem(SAVE_KEY); } catch { /* sin almacenamiento */ }
    for (let i = 0; i < 7; i++) {
      this.flyers.push({ x: Math.random() * VIEW_W, y: 20 + Math.random() * 90, v: 14 + Math.random() * 22, ph: Math.random() * 6 });
    }
  }

  start() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.sfx.startAmbient(() => this.phase(), () => this.screen);
    this.lastT = performance.now();
    const loop = (t: number) => {
      const dt = clamp((t - this.lastT) / 1000, 0, 0.05);
      this.lastT = t;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    this.pushUI();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.sfx.stopAmbient();
  }

  // ───────────────────────── helpers de estado ─────────────────────────
  private phase(): Phase {
    const h = (START_HOUR + (this.dayT / DAY_LEN) * 24) % 24;
    if (h >= 5 && h < 8) return "dawn";
    if (h >= 8 && h < 17.5) return "day";
    if (h >= 17.5 && h < 20.5) return "dusk";
    return "night";
  }
  private clock(): string {
    const h = (START_HOUR + (this.dayT / DAY_LEN) * 24) % 24;
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  private phaseName(): string {
    const p = this.phase();
    return p === "dawn" ? "Amanecer" : p === "day" ? "Mediodía" : p === "dusk" ? "Atardecer" : "Noche";
  }
  private zoneName(): string {
    return zoneNameAt(this.tileHere());
  }
  private tileAt(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return "W";
    return MAP[y][x];
  }
  private tileHere(): string {
    return this.tileAt(this.px, this.py);
  }

  private guideCounts() {
    let seen = 0, photos = 0;
    for (const b of BIRDS) {
      const g = this.guide[b.id];
      if (g?.seen) seen++;
      if (g && g.photo > 0) photos++;
    }
    return { seen, photos };
  }

  private toast(text: string, kind: "info" | "good" | "warn" | "rare") {
    this.toasts.push({ id: this.toastId++, text, kind, exp: this.time + 4 });
    if (this.toasts.length > 3) this.toasts.shift();
    this.pushUI();
  }

  private currentHint(): string {
    const fx = this.px + (this.dir === "left" ? -1 : this.dir === "right" ? 1 : 0);
    const fy = this.py + (this.dir === "up" ? -1 : this.dir === "down" ? 1 : 0);
    const f = this.tileAt(fx, fy);
    if (f === "B") return "A / E · Observatorio: pistas y cebos";
    if (f === "C") return "A / E · Leer cartel";
    return ZONE_FLAVOR[this.zoneName()] ?? "Marismas del Odiel";
  }

  private buildUI(): UIState {
    const { seen, photos } = this.guideCounts();
    const enc = this.enc;
    return {
      screen: this.screen,
      introStep: this.introStep,
      introTotal: 3,
      paused: this.paused,
      muted: this.sfx.muted,
      guideOpen: this.guideOpen,
      hasSave: this.hasSave,
      dialog: this.dialog,
      hud: {
        score: this.score, seen, photos, total: BIRDS.length,
        clock: this.clock(), phaseName: this.phaseName(), zone: this.zoneName(),
        cebos: this.cebos, hint: this.currentHint(),
      },
      encounter: enc
        ? {
            birdId: enc.birdId, name: enc.name, sci: enc.sci,
            // se revela en cuanto se observa (la guía manda)
            known: this.guide[enc.birdId]?.seen ?? enc.known,
            alerta: enc.alerta, maxAlerta: enc.maxAlerta, mode: enc.mode,
            text: enc.text, resultado: enc.resultado, canCebo: this.cebos > 0 && !enc.usedCebo,
          }
        : null,
      guide: JSON.parse(JSON.stringify(this.guide)) as Record<string, GuideEntry>,
      victory: this.victory,
      toasts: this.toasts.map(({ id, text, kind }) => ({ id, text, kind })),
    };
  }
  private pushUI() { this.setUI(this.buildUI()); }

  // ───────────────────────── comandos externos ─────────────────────────
  press(action: string) {
    this.sfx.ensure();
    switch (action) {
      case "start": this.newGame(); break;
      case "continue": this.continueGame(); break;
      case "title": this.screen = "title"; this.paused = false; this.pushUI(); break;
      case "intro-next": this.introNext(); break;
      case "primary": this.primary(); break;
      case "interact": this.interactAction(); break;
      case "observar": this.encObservar(); break;
      case "foto": this.encFoto(); break;
      case "cebo": this.encCebo(); break;
      case "marcharse": this.encMarcharse(); break;
      case "guide": this.toggleGuide(); break;
      case "pause": this.togglePause(); break;
      case "mute": this.sfx.ensure(); this.sfx.setMuted(!this.sfx.muted); this.sfx.select(); this.pushUI(); break;
      case "restart":
        try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
        this.hasSave = false;
        this.newGame();
        break;
      case "keep-playing": this.victory = null; this.clearKeys(); this.screen = "world"; this.pushUI(); break;
    }
  }

  private newGame() {
    this.screen = "intro"; this.introStep = 0;
    this.score = 0; this.cebos = 3; this.dayT = 0;
    this.px = this.tx = SPAWN[0]; this.py = this.ty = SPAWN[1];
    this.dir = "down";
    this.moving = false; this.cooldown = 0; this.enc = null;
    this.dialog = null; this.victory = null; this.pendingVictory = 0;
    for (const b of BIRDS) this.guide[b.id] = { seen: false, photo: 0 };
    this.lastZone = "";
    this.sfx.select();
    this.pushUI();
  }

  private continueGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        this.score = s.score ?? 0;
        this.cebos = s.cebos ?? 3;
        this.dayT = s.dayT ?? 0;
        this.px = this.tx = clamp(s.px ?? SPAWN[0], 0, MAP_W - 1);
        this.py = this.ty = clamp(s.py ?? SPAWN[1], 0, MAP_H - 1);
        if (s.guide) for (const b of BIRDS) if (s.guide[b.id]) this.guide[b.id] = s.guide[b.id];
      }
    } catch { /* partida corrupta: nueva */ }
    this.screen = "world";
    this.lastZone = "";
    this.sfx.select();
    this.toast("Partida recuperada. ¡Buena observación!", "good");
    this.pushUI();
  }

  private introNext() {
    this.sfx.page();
    this.introStep++;
    if (this.introStep >= 3) {
      this.screen = "world";
      this.toast("Reto: fotografía las 20 especies de la guía", "rare");
    }
    this.pushUI();
  }

  private primary() {
    if (this.screen === "title") { this.newGame(); return; }
    if (this.screen === "intro") { this.introNext(); return; }
    if (this.dialog) { this.dialog = null; this.clearKeys(); this.sfx.back(); this.pushUI(); return; }
    if (this.enc) {
      if (this.enc.mode === "texto") {
        if (this.enc.alerta >= MAX_ALERTA) this.encFlee();
        else { this.enc.mode = "menu"; this.sfx.move(); }
        this.pushUI();
      } else if (this.enc.mode === "foto") {
        this.shoot();
      } else if (this.enc.mode === "resultado") {
        this.endEncounter();
      }
      return;
    }
    // En el mundo: si hay un observatorio o cartel delante, el botón A lo activa
    if (this.screen === "world" && !this.guideOpen && !this.paused) {
      const fx = this.px + (this.dir === "left" ? -1 : this.dir === "right" ? 1 : 0);
      const fy = this.py + (this.dir === "up" ? -1 : this.dir === "down" ? 1 : 0);
      const f = this.tileAt(fx, fy);
      if (f === "B" || f === "C") this.interact();
    }
  }

  private toggleGuide() {
    if (this.screen !== "world" || this.enc || this.dialog) return;
    this.guideOpen = !this.guideOpen;
    this.clearKeys();
    this.sfx.page();
    this.pushUI();
  }
  private togglePause() {
    if (this.screen !== "world" || this.enc) return;
    this.paused = !this.paused;
    this.clearKeys();
    this.sfx.move();
    this.pushUI();
  }

  // ───────────────────────── teclado ───────────────────────────────────
  private onKeyDown = (e: KeyboardEvent) => this.keyDown(e);
  private onKeyUp = (e: KeyboardEvent) => this.keyUp(e);

  private keyDown(e: KeyboardEvent) {
    const k = e.key;
    const nav = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"];
    if (nav.includes(k)) e.preventDefault();
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"].includes(k)) {
      if (!this.keys.includes(k)) this.keys.push(k);
      return;
    }
    switch (k) {
      case " ": case "Enter": this.press("primary"); break;
      case "e": case "E": this.press("interact"); break;
      case "g": case "G": this.press("guide"); break;
      case "m": case "M": this.press("mute"); break;
      case "Escape":
        if (this.guideOpen) this.toggleGuide();
        else if (this.dialog) { this.dialog = null; this.pushUI(); }
        else if (this.screen === "world" && !this.enc) this.togglePause();
        break;
      case "1": this.press("observar"); break;
      case "2": this.press("foto"); break;
      case "3": this.press("cebo"); break;
      case "4": this.press("marcharse"); break;
    }
  }
  private keyUp(e: KeyboardEvent) {
    this.keys = this.keys.filter((k) => k !== e.key);
  }

  private dirFromKeys(): "up" | "down" | "left" | "right" | null {
    for (let i = this.keys.length - 1; i >= 0; i--) {
      const k = this.keys[i].toLowerCase();
      if (k === "arrowup" || k === "w") return "up";
      if (k === "arrowdown" || k === "s") return "down";
      if (k === "arrowleft" || k === "a") return "left";
      if (k === "arrowright" || k === "d") return "right";
    }
    return null;
  }

  // Limpia las teclas pulsadas: evita que el personaje siga andando cuando
  // la cruceta táctil se desmonta (encuentros, diálogos, guías…)
  private clearKeys() {
    this.keys = [];
  }

  // Acción "mirar/interactuar": botón táctil + tecla E (también cierra diálogos)
  private interactAction() {
    if (this.dialog) {
      this.dialog = null;
      this.sfx.back();
      this.pushUI();
      return;
    }
    if (this.screen === "world" && !this.enc && !this.guideOpen && !this.paused) this.interact();
  }

  private interact() {
    this.clearKeys();
    const fx = this.px + (this.dir === "left" ? -1 : this.dir === "right" ? 1 : 0);
    const fy = this.py + (this.dir === "up" ? -1 : this.dir === "down" ? 1 : 0);
    const t = this.tileAt(fx, fy);
    if (t === "C") {
      const s = SIGNS.find((sg) => sg.x === fx && sg.y === fy);
      this.dialog = s ? { title: s.title, text: s.text } : { title: "Cartel", text: GENERIC_SIGN };
      this.sfx.page();
      this.pushUI();
    } else if (t === "B") {
      this.cebos = 3;
      this.sfx.observatory();
      this.save();
      const tips: Record<Phase, string> = {
        dawn: "Con las primeras luces, el águila pescadora patrulla la ría. Camina las pasarelas y abre bien los ojos.",
        day: "Mediodía: los jilgueros revolotean en el matorral y las limícolas peinan el fangal. El calor adormece a las gallinetas.",
        dusk: "Al atardecer las espátulas vuelven a los dormideros y el mirlo canta en los claros. Momento dorado para la fotografía.",
        night: "De noche solo oirás al mirlo y al petirrojo. Vuelve al amanecer... o aguanta aquí, con paciencia.",
      };
      this.dialog = { title: "Observatorio del Odiel", text: `Cebos repuestos (${this.cebos}). Partida guardada. ${tips[this.phase()]}` };
      this.pushUI();
    }
  }

  // ───────────────────────── update ────────────────────────────────────
  private update(dt: number) {
    this.time += dt;
    if ((this.screen === "world" || this.screen === "victory") && !this.paused) this.updateWorld(dt);
    if (this.screen === "title" || this.screen === "intro" || this.screen === "victory") this.updateFlyers(dt);
    this.flash = Math.max(0, this.flash - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 14);
    if (this.toasts.length && this.toasts[0].exp < this.time) {
      this.toasts.shift();
      this.pushUI();
    }
    if (this.pendingVictory > 0 && this.time > this.pendingVictory && !this.enc) {
      this.pendingVictory = 0;
      this.declareVictory();
    }
  }

  private updateWorld(dt: number) {
    this.dayT += dt;
    const ph = this.phase();
    if (ph !== this.lastPhase) { this.lastPhase = ph; this.pushUI(); }
    const zone = this.zoneName();
    if (zone !== this.lastZone) { this.lastZone = zone; this.pushUI(); }

    this.cooldown = Math.max(0, this.cooldown - dt);

    // movimiento por teclas
    if (this.moving && !this.enc && this.screen === "world") {
      this.moveT += dt / MOVE_TIME;
      if (this.moveT >= 1) {
        this.moveT = 0;
        this.px = this.tx; this.py = this.ty;
        this.moving = false;
        if (!this.enc) this.onArrive();
      }
    }
    if (!this.moving && !this.dialog && !this.guideOpen && !this.paused && !this.enc && this.screen === "world") {
      const d = this.dirFromKeys();
      if (d) {
        this.dir = d;
        const nx = this.px + (d === "left" ? -1 : d === "right" ? 1 : 0);
        const ny = this.py + (d === "up" ? -1 : d === "down" ? 1 : 0);
        if (!isBlocking(this.tileAt(nx, ny))) {
          this.tx = nx; this.ty = ny; this.moving = true; this.moveT = 0;
        }
      }
    }

    // pasos y sonidos
    if (this.moving && !this.enc && this.screen === "world") {
      this.stepAcc += dt;
      if (this.stepAcc > 0.18) {
        this.stepAcc = 0;
        const t = this.tileAt(this.px, this.py);
        if (t === "R" && Math.random() < 0.5) this.sfx.rustle();
        else this.sfx.step();
      }
    }
    this.walkT += dt;

    // foto: barra oscilante
    if (this.enc && this.enc.mode === "foto") {
      this.photoT += dt;
    }
    if (this.enc && this.enc.mode === "huida") {
      this.fleeT += dt;
      if (this.fleeT > 0.85) this.endEncounter();
    }

    this.updateParticles(dt);
  }

  private onArrive() {
    this.pushUI(); // la pista contextual ("A / E · ...") se actualiza al llegar
    const t = this.tileHere();
    const z = zoneOf(t);
    if (!z || this.cooldown > 0 || this.enc) return;
    const chance = z === "carrizal" ? 0.26 : z === "fangal" ? 0.22 : z === "matorral" ? 0.2 : 0.22;
    if (Math.random() < chance) this.tryEncounter(z);
    else this.cooldown = 0.35;
  }

  private pickBird(z: Zone): Bird {
    const pool = ENCOUNTERS[z].map((id) => BIRDS.find((b) => b.id === id)!).filter(Boolean);
    const ph = this.phase();
    const weights = pool.map((b) => RARITY_W[b.rarity] * Math.max(0.02, b.time[ph]));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  private tryEncounter(z: Zone) {
    const chosen = this.pickBird(z);
    this.sfx.encounter();
    this.sfx.chirp(chosen.cry);
    const known = this.guide[chosen.id]?.seen ?? false;
    this.clearKeys();
    this.shake = 5;
    this.burst(VIEW_W / 2, VIEW_H / 2, "#ffb43a", 14, "spark");
    this.enc = {
      birdId: chosen.id, bird: chosen,
      name: chosen.name, sci: chosen.sci, known,
      alerta: 0, maxAlerta: MAX_ALERTA,
      mode: "menu",
      text: known
        ? `¡${chosen.name}! Lo tienes delante, a poca distancia.`
        : "¡Un ave que no reconoces se posa cerca! Apunta con los prismáticos.",
      resultado: null, usedCebo: false, calm: false,
    };
    if (!known) this.burst(300, 120, "#ffb43a", 10, "spark");
    this.cooldown = 2.5;
    this.pushUI();
  }

  // ───────────────────────── encuentro ─────────────────────────────────
  private encObservar() {
    const e = this.enc;
    if (!e || e.mode !== "menu") return;
    this.sfx.observe();
    if (!this.guide[e.birdId].seen) {
      this.guide[e.birdId].seen = true;
      const pts = SIGHT_POINTS[e.bird.rarity];
      this.score += pts;
      this.sfx.newSpecies();
      e.text = `${e.name} (${e.sci}). ${e.bird.desc} Nueva especie anotada en la guía: +${pts} puntos.`;
    } else {
      e.text = e.bird.desc;
      e.alerta = Math.min(MAX_ALERTA, e.alerta + (e.calm ? 0 : 1));
    }
    e.mode = "texto";
    this.save();
    this.pushUI();
  }

  private encFoto() {
    const e = this.enc;
    if (!e || e.mode !== "menu") return;
    this.sfx.move();
    e.mode = "foto";
    this.photoT = 0;
    this.pushUI();
  }

  private photoPos(): number {
    const e = this.enc!;
    const speed = (0.55 + e.bird.skittish * 0.22) * (e.calm ? 0.6 : 1);
    const t = (this.photoT * speed) % 2;
    return t < 1 ? t : 2 - t; // triángulo 0..1..0
  }

  private shoot() {
    const e = this.enc;
    if (!e || e.mode !== "foto") return;
    const pos = this.photoPos();
    const d = Math.abs(pos - 0.5);
    const f = e.calm ? 1.5 : 1;
    const quality: 1 | 2 | 3 = d <= 0.09 * f ? 3 : d <= 0.24 * f ? 2 : 1;
    this.flash = 1;
    this.shake = 6;
    this.sfx.shutter();
    const newSpecies = this.guide[e.birdId].photo === 0;
    let points = PHOTO_BONUS[quality] + e.bird.rarity * 60;
    if (newSpecies) points *= 2;
    this.score += points;
    const prev = this.guide[e.birdId];
    this.guide[e.birdId] = { seen: true, photo: Math.max(prev.photo, quality) as 0 | 1 | 2 | 3 };
    if (quality === 3) this.sfx.perfect();
    else if (quality === 2) this.sfx.good();
    else {
      this.sfx.fail();
      e.alerta = Math.min(MAX_ALERTA, e.alerta + (e.calm ? 1 : 2));
    }
    if (newSpecies) this.sfx.newSpecies();
    e.resultado = { quality, points, newSpecies };
    e.mode = "resultado";
    e.text = newSpecies
      ? `¡Fotografía ${PHOTO_LABEL[quality].toLowerCase()} de ${e.name}! Entra directa en tu guía de campo.`
      : `Fotografía ${PHOTO_LABEL[quality].toLowerCase()}. Tu mejor toma de ${e.name} queda en la guía.`;
    this.burst(300, 130, quality === 3 ? "#ffd34e" : "#f2ead4", quality === 3 ? 22 : 10, "spark");
    this.save();
    this.checkVictory();
    this.pushUI();
  }

  private encCebo() {
    const e = this.enc;
    if (!e || e.mode !== "menu" || this.cebos <= 0 || e.usedCebo) return;
    this.cebos--;
    e.usedCebo = true;
    e.calm = true;
    e.alerta = Math.max(0, e.alerta - 2);
    this.sfx.cebo();
    e.text = `Lanzas un puñado de semillas. ${e.name} picotea con confianza: ahora será más fácil fotografiarla.`;
    e.mode = "texto";
    this.pushUI();
  }

  private encMarcharse() {
    const e = this.enc;
    if (!e || e.mode !== "menu") return;
    this.sfx.back();
    this.endEncounter();
  }

  private encFlee() {
    const e = this.enc;
    if (!e) return;
    e.mode = "huida";
    this.fleeT = 0;
    this.sfx.flee();
    this.pushUI();
  }

  private endEncounter() {
    this.enc = null;
    this.clearKeys();
    this.cooldown = 3;
    this.screen = "world";
    this.pushUI();
  }

  private checkVictory() {
    const { photos } = this.guideCounts();
    if (photos >= BIRDS.length && !this.victory && this.pendingVictory === 0) {
      this.pendingVictory = this.time + 1.6;
    }
  }

  private declareVictory() {
    const rank = this.score >= 7000 ? "Pluma de Oro" : this.score >= 5500 ? "Pluma de Plata" : "Pluma de Bronce";
    this.victory = { score: this.score, photos: BIRDS.length, rank };
    this.enc = null;
    this.dialog = null;
    this.clearKeys();
    this.screen = "victory";
    this.sfx.victory();
    this.save();
    this.pushUI();
  }

  // ───────────────────────── guardado ──────────────────────────────────
  private save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1, score: this.score, cebos: this.cebos, dayT: this.dayT,
        px: this.px, py: this.py, guide: this.guide,
      }));
      this.hasSave = true;
    } catch { /* sin almacenamiento */ }
  }

  // ───────────────────────── partículas ────────────────────────────────
  private burst(x: number, y: number, color: string, n: number, _kind: "spark") {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 30 + Math.random() * 80;
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30,
        life: 0, max: 0.5 + Math.random() * 0.5,
        color, size: 1 + Math.floor(Math.random() * 2), grav: 120,
      });
    }
  }
  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }
  private updateFlyers(dt: number) {
    for (const f of this.flyers) {
      f.x += f.v * dt;
      f.ph += dt * 8;
      if (f.x > VIEW_W + 20) { f.x = -20; f.y = 15 + Math.random() * 100; }
    }
  }

  // ───────────────────────── render ────────────────────────────────────
  private spriteCanvas(sp: Sprite): HTMLCanvasElement {
    let c = this.spriteCache.get(sp);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = 16; c.height = 16;
    const g = c.getContext("2d")!;
    sp.px.forEach((row, y) => {
      for (let x = 0; x < 16; x++) {
        const ch = row[x];
        if (!ch || ch === "." || ch === " ") continue;
        const col = sp.pal[ch];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    });
    this.spriteCache.set(sp, c);
    return c;
  }

  private drawSprite(sp: Sprite, x: number, y: number, scale: number, flip = false) {
    const c = this.spriteCanvas(sp);
    const ctx = this.ctx;
    if (flip) {
      ctx.save();
      ctx.translate(x + 16 * scale, y);
      ctx.scale(-1, 1);
      ctx.drawImage(c, 0, 0, 16 * scale, 16 * scale);
      ctx.restore();
    } else {
      ctx.drawImage(c, x, y, 16 * scale, 16 * scale);
    }
  }

  private render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    if (this.enc) this.drawEncounterScene();
    else this.drawWorld();
    // partículas
    for (const p of this.particles) {
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size + 1, p.size + 1);
    }
    ctx.globalAlpha = 1;
    // flash de cámara
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash.toFixed(3)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    ctx.restore();
  }

  private drawWorld() {
    const ctx = this.ctx;
    const ph = this.phase();

    // cielo
    const skies = SKIES[ph];
    const bandH = Math.ceil(150 / skies.length);
    skies.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, i * bandH - (i === skies.length - 1 ? 150 - bandH * skies.length : 0), VIEW_W, bandH + 1);
    });
    // sol / luna
    if (ph === "day" || ph === "dawn" || ph === "dusk") {
      const prog = this.dayT % DAY_LEN / DAY_LEN;
      const sx = 40 + prog * 400;
      ctx.fillStyle = ph === "day" ? "#ffe9a8" : "#ff9f6f";
      ctx.fillRect(sx - 10, 26, 20, 20);
      ctx.fillStyle = "rgba(255,240,200,0.35)";
      ctx.fillRect(sx - 13, 23, 26, 26);
    } else {
      ctx.fillStyle = "#e8ecf4";
      ctx.fillRect(380, 24, 16, 16);
      ctx.fillStyle = SKIES.night[1];
      ctx.fillRect(385, 21, 14, 14);
    }
    // aves volando (portada / victoria)
    if (this.screen === "title" || this.screen === "intro" || this.screen === "victory") {
      ctx.strokeStyle = ph === "night" ? "#c8d4e8" : "#241830";
      ctx.lineWidth = 1;
      for (const f of this.flyers) {
        const w = Math.sin(f.ph) * 3;
        ctx.beginPath();
        ctx.moveTo(f.x - 5, f.y - w);
        ctx.lineTo(f.x, f.y);
        ctx.lineTo(f.x + 5, f.y - w);
        ctx.stroke();
      }
    }

    // cámara
    const ix = this.moving ? this.px + (this.tx - this.px) * this.moveT : this.px;
    const iy = this.moving ? this.py + (this.ty - this.py) * this.moveT : this.py;
    const camX = clamp(Math.floor(ix * TILE + 8 - VIEW_W / 2), 0, MAP_W * TILE - VIEW_W);
    const camY = clamp(Math.floor(iy * TILE + 8 - VIEW_H / 2), 0, MAP_H * TILE - VIEW_H);

    const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
    const x1 = Math.min(MAP_W - 1, x0 + Math.ceil(VIEW_W / TILE) + 1);
    const y1 = Math.min(MAP_H - 1, y0 + Math.ceil(VIEW_H / TILE) + 1);
    const t = this.time;

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const ch = MAP[y][x];
        const sx = x * TILE - camX, sy = y * TILE - camY;
        this.drawTile(ch, sx, sy, x, y, t);
      }
    }

    // flamencos decorativos
    for (const [fx, fy] of FLAMINGOS) {
      const sx = fx * TILE - camX, sy = fy * TILE - camY;
      if (sx < -20 || sy < -20 || sx > VIEW_W + 20 || sy > VIEW_H + 20) continue;
      const dip = Math.sin(t * 1.4 + fx * 2) > 0.55;
      ctx.fillStyle = "#ff9fb6";
      ctx.fillRect(sx + 4, sy + (dip ? 9 : 4), 8, 5);
      ctx.fillStyle = "#e76f92";
      ctx.fillRect(sx + 6, sy + (dip ? 7 : 2), 4, 3);
      ctx.fillStyle = "#241830";
      ctx.fillRect(sx + 5, sy + 13, 1, 3);
      ctx.fillRect(sx + 10, sy + 13, 1, 3);
    }

    // Anna
    if (this.screen !== "title" && this.screen !== "intro") {
      const pxs = ix * TILE + 8 - camX, pys = iy * TILE + 8 - camY;
      const frames = this.dir === "up" ? ANNA.up : this.dir === "down" ? ANNA.down : ANNA.side;
      const frame = this.moving ? Math.floor(this.walkT / 0.16) % 2 : 0;
      this.drawSprite(frames[frame], Math.floor(pxs - 8), Math.floor(pys - 13), 1, this.dir === "right");
      // sombra
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(Math.floor(pxs - 5), Math.floor(pys + 3), 10, 2);
    }

    // tinte de hora
    const [tintCol, tintA] = TINT[ph];
    if (tintA > 0) {
      ctx.fillStyle = tintCol;
      ctx.globalAlpha = tintA;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }

  // ─── Escena de encuentro: cielo, Anna a la izquierda, ave a la derecha ───
  private drawEncounterScene() {
    const ctx = this.ctx;
    const ph = this.phase();
    const t = this.time;
    const e = this.enc!;

    // cielo a pantalla completa según la fase del día
    const skies = SKIES[ph];
    const bandH = Math.ceil(176 / skies.length);
    skies.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, i * bandH, VIEW_W, bandH + 1);
    });

    // sol, luna o estrellas
    if (ph === "night") {
      ctx.fillStyle = "#c8d4e8";
      for (let i = 0; i < 26; i++) {
        const sx = (i * 97) % VIEW_W, sy = (i * 53) % 130;
        if ((i + Math.floor(t * 2)) % 4 !== 0) ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.fillStyle = "#e8ecf4";
      ctx.fillRect(392, 22, 16, 16);
      ctx.fillStyle = skies[1];
      ctx.fillRect(397, 19, 14, 14);
    } else {
      const sx = ph === "dawn" ? 90 : ph === "dusk" ? 390 : 240;
      ctx.fillStyle = "rgba(255,240,200,0.35)";
      ctx.fillRect(sx - 14, 20, 30, 30);
      ctx.fillStyle = ph === "day" ? "#ffe9a8" : "#ff9f6f";
      ctx.fillRect(sx - 10, 24, 22, 22);
    }

    // carrizal lejano en el horizonte
    ctx.fillStyle = "#2c4a2c";
    ctx.fillRect(0, 152, VIEW_W, 26);
    ctx.fillStyle = "#3f6b3a";
    for (let x = 0; x < VIEW_W; x += 6) {
      const hh = 8 + ((x * 7) % 10);
      const sw = Math.sin(t * 2 + x) > 0 ? 1 : 0;
      ctx.fillRect(x + sw, 162 - hh, 2, hh);
    }

    // suelo de fangal
    ctx.fillStyle = "#9c8158";
    ctx.fillRect(0, 176, VIEW_W, VIEW_H - 176);
    ctx.fillStyle = "#7d6744";
    for (let i = 0; i < 14; i++) {
      const gx = (i * 71) % VIEW_W, gy = 184 + ((i * 37) % 70);
      ctx.fillRect(gx, gy, 10 + (i % 3) * 6, 3);
    }
    // charcos con brillo animado
    ctx.fillStyle = "#6fb8b4";
    ctx.fillRect(20, 210, 60, 10);
    ctx.fillRect(150, 240, 80, 12);
    const w = Math.floor(t * 5) % 8;
    ctx.fillStyle = "#9fd8d0";
    ctx.fillRect(24 + w, 213, 10, 2);
    ctx.fillRect(156 + w, 244, 12, 2);

    // rama donde posa el ave
    const perchY = 150;
    ctx.fillStyle = "#5b4632";
    ctx.fillRect(280, perchY, 130, 5);
    ctx.fillRect(396, perchY, 6, 30);
    ctx.fillRect(292, perchY, 5, 26);

    if (e.mode === "huida") {
      // el ave levanta el vuelo
      const p = Math.min(1, this.fleeT / 0.85);
      this.drawSprite(e.bird.sprite, 316 + p * 180, 70 - p * 120, 5 - p * 2.5);
    } else {
      const bob = Math.sin(t * 3) * 3;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(320, perchY - 1, 56, 2);
      this.drawSprite(e.bird.sprite, 316, perchY - 80 + bob, 5);
      // signo de admiración si la especie es nueva
      if (!e.known) {
        ctx.fillStyle = "#ffb43a";
        const ey = 28 + Math.sin(t * 5) * 2;
        ctx.fillRect(344, ey, 6, 20);
        ctx.fillRect(344, ey + 26, 6, 6);
      }
    }

    // Anna a la izquierda (de espaldas), escala ×3
    this.drawSprite(ANNA.up[0], 64, 168, 3);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(62, 214, 52, 4);

    // tinte de la fase
    const [tintCol, tintA] = TINT[ph];
    if (tintA > 0) {
      ctx.fillStyle = tintCol;
      ctx.globalAlpha = tintA;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }

    if (e.mode === "foto") this.drawAimBar();
  }

  private drawTile(ch: string, sx: number, sy: number, x: number, y: number, t: number) {
    const ctx = this.ctx;
    const h = (x * 7 + y * 13) % 5;
    switch (ch) {
      case ".": {
        ctx.fillStyle = "#c9b184";
        ctx.fillRect(sx, sy, 16, 16);
        ctx.fillStyle = "#b89f72";
        ctx.fillRect(sx + h * 2, sy + (h * 3) % 12, 2, 2);
        ctx.fillRect(sx + 10 - h, sy + 8, 2, 1);
        break;
      }
      case ",": {
        ctx.fillStyle = "#9c8158";
        ctx.fillRect(sx, sy, 16, 16);
        ctx.fillStyle = "#7d6744";
        ctx.fillRect(sx + (h * 4) % 12, sy + 4, 4, 2);
        ctx.fillRect(sx + 2, sy + 11, 3, 2);
        // brillo de agua
        if ((x + y + Math.floor(t * 2)) % 7 === 0) {
          ctx.fillStyle = "#c8dce0";
          ctx.fillRect(sx + 6, sy + 7, 4, 1);
        }
        break;
      }
      case "R": {
        ctx.fillStyle = "#3f6b3a";
        ctx.fillRect(sx, sy, 16, 16);
        ctx.fillStyle = "#5b8a4a";
        const sw = Math.sin(t * 2 + x) > 0 ? 1 : 0;
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(sx + 2 + i * 4 + (i === 1 ? sw : 0), sy + 2, 1, 13);
        }
        ctx.fillStyle = "#7dab5e";
        ctx.fillRect(sx + 3, sy + 3, 1, 8);
        ctx.fillRect(sx + 11, sy + 5, 1, 8);
        break;
      }
      case "S": {
        ctx.fillStyle = "#4a7040";
        ctx.fillRect(sx, sy, 16, 16);
        ctx.fillStyle = "#33522e";
        ctx.fillRect(sx + h, sy + 2, 7, 6);
        ctx.fillRect(sx + 8 - h, sy + 9, 7, 5);
        ctx.fillStyle = "#5f8a4e";
        ctx.fillRect(sx + h + 2, sy + 3, 2, 2);
        break;
      }
      case "T": {
        ctx.fillStyle = "#4a7040";
        ctx.fillRect(sx, sy, 16, 16);
        ctx.fillStyle = "#5b4632";
        ctx.fillRect(sx + 7, sy + 8, 2, 7);
        ctx.fillStyle = "#2f5230";
        ctx.fillRect(sx + 2, sy + 1, 12, 8);
        ctx.fillStyle = "#47754a";
        ctx.fillRect(sx + 4, sy + 3, 8, 4);
        break;
      }
      case "A": {
        ctx.fillStyle = "#e3cf9f";
        ctx.fillRect(sx, sy, 16, 16);
        ctx.fillStyle = "#d0b988";
        ctx.fillRect(sx + (h * 3) % 10, sy + 5, 2, 2);
        ctx.fillStyle = "#f2e4bd";
        ctx.fillRect(sx + 9, sy + 10, 3, 1);
        break;
      }
      case "~": {
        ctx.fillStyle = "#3f9aa0";
        ctx.fillRect(sx, sy, 16, 16);
        const w = Math.floor(t * 6 + x * 3 + y) % 8;
        ctx.fillStyle = "#7fc8c0";
        ctx.fillRect(sx + w, sy + 4, 5, 1);
        ctx.fillRect(sx + (w + 4) % 12, sy + 11, 4, 1);
        break;
      }
      case "W": {
        ctx.fillStyle = "#14424f";
        ctx.fillRect(sx, sy, 16, 16);
        ctx.fillStyle = "#1d5a6b";
        const w = Math.floor(t * 4 + x * 5 + y * 2) % 10;
        ctx.fillRect(sx + w, sy + 6, 5, 1);
        ctx.fillStyle = "#2d7585";
        ctx.fillRect(sx + (w + 6) % 12, sy + 12, 3, 1);
        break;
      }
      case "L": {
        ctx.fillStyle = "#6fb8b4";
        ctx.fillRect(sx, sy, 16, 16);
        ctx.fillStyle = "#9fd8d0";
        const w = Math.floor(t * 3 + x * 2 + y * 4) % 9;
        ctx.fillRect(sx + w, sy + 5, 6, 1);
        if ((x + y + Math.floor(t)) % 5 === 0) {
          ctx.fillStyle = "#e8f4f0";
          ctx.fillRect(sx + 8, sy + 10, 2, 1);
        }
        break;
      }
      case "P": {
        ctx.fillStyle = "#8a6a44";
        ctx.fillRect(sx, sy, 16, 16);
        ctx.fillStyle = "#6b4f30";
        ctx.fillRect(sx, sy + 3, 16, 1);
        ctx.fillRect(sx, sy + 8, 16, 1);
        ctx.fillRect(sx, sy + 13, 16, 1);
        ctx.fillStyle = "#a08050";
        ctx.fillRect(sx, sy, 16, 1);
        break;
      }
      case "C": {
        ctx.fillStyle = "#c9b184";
        ctx.fillRect(sx, sy, 16, 16);
        ctx.fillStyle = "#5b4632";
        ctx.fillRect(sx + 7, sy + 8, 2, 7);
        ctx.fillStyle = "#e8d8b0";
        ctx.fillRect(sx + 2, sy + 2, 12, 7);
        ctx.fillStyle = "#241830";
        ctx.fillRect(sx + 4, sy + 4, 8, 1);
        ctx.fillRect(sx + 4, sy + 6, 6, 1);
        break;
      }
      case "B": {
        ctx.fillStyle = "#c9b184";
        ctx.fillRect(sx, sy, 16, 16);
        ctx.fillStyle = "#6b4f30";
        ctx.fillRect(sx + 1, sy + 4, 14, 11);
        ctx.fillStyle = "#8a6a44";
        ctx.fillRect(sx + 2, sy + 5, 12, 9);
        ctx.fillStyle = "#3a2c1a";
        ctx.fillRect(sx + 3, sy + 1, 10, 4);
        ctx.fillStyle = "#0d2a22";
        ctx.fillRect(sx + 4, sy + 8, 3, 4);
        ctx.fillRect(sx + 9, sy + 8, 3, 4);
        ctx.fillStyle = "#ffb43a";
        ctx.fillRect(sx + 12, sy + 2, 2, 2);
        break;
      }
    }
  }

  private drawAimBar() {
    const ctx = this.ctx;
    const pos = this.photoPos();
    const bx0 = 100, bx1 = 380, bw = bx1 - bx0, byy = 194;
    ctx.fillStyle = "rgba(4,18,12,0.8)";
    ctx.fillRect(bx0 - 8, byy - 16, bw + 16, 44);
    // zonas
    ctx.fillStyle = "#3a3028";
    ctx.fillRect(bx0, byy, bw, 10);
    ctx.fillStyle = "#7d6744";
    ctx.fillRect(bx0 + bw * 0.26, byy, bw * 0.48, 10);
    ctx.fillStyle = "#93d48c";
    ctx.fillRect(bx0 + bw * 0.41, byy, bw * 0.18, 10);
    ctx.fillStyle = "#ffb43a";
    ctx.fillRect(bx0 + bw * 0.47, byy, bw * 0.06, 10);
    // marco
    ctx.strokeStyle = "#071a14";
    ctx.strokeRect(bx0 - 1, byy - 1, bw + 2, 12);
    // marcador
    const mx = bx0 + pos * bw;
    ctx.fillStyle = "#f2ead4";
    ctx.beginPath();
    ctx.moveTo(mx, byy - 4);
    ctx.lineTo(mx - 5, byy - 12);
    ctx.lineTo(mx + 5, byy - 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(mx - 1, byy - 4, 2, 18);
    ctx.fillStyle = "#f2ead4";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillText("¡DISPARA EN EL CENTRO!", bx0 + 34, byy + 24);
  }
}
