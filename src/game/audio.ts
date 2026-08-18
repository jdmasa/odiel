// ─── Motor de sonido: todo sintetizado con WebAudio ─────────────────────────
type Wave = OscillatorType;

export class SFX {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  private ambientTimer: number | null = null;

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  private tone(
    freq: number, dur: number, type: Wave = "square",
    vol = 0.16, slide = 0, delay = 0
  ) {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide !== 0) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol = 0.2, freq = 1200, delay = 0) {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
  }

  // ── UI ──
  move() { this.tone(340, 0.05, "square", 0.08); }
  select() { this.tone(520, 0.07, "square", 0.12); this.tone(780, 0.09, "square", 0.1, 0, 0.06); }
  back() { this.tone(300, 0.08, "square", 0.1, -120); }
  page() { this.noise(0.12, 0.08, 2400); }
  deny() { this.tone(200, 0.12, "square", 0.12, -60); }

  // ── Mundo ──
  step() { this.noise(0.04, 0.03, 700); }
  rustle() { this.noise(0.14, 0.07, 900); }
  encounter() {
    [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.09, "square", 0.14, 0, i * 0.06));
    this.noise(0.25, 0.1, 500, 0.05);
  }

  // ── Canto por especie ──
  chirp(kind: 0 | 1 | 2 | 3) {
    if (kind === 0) {
      for (let i = 0; i < 3; i++) this.tone(2100 + Math.random() * 500, 0.06, "sine", 0.1, 300, i * 0.1);
    } else if (kind === 1) {
      this.tone(320, 0.16, "sawtooth", 0.09, -80);
      this.tone(280, 0.2, "sawtooth", 0.08, -60, 0.18);
    } else if (kind === 2) {
      for (let i = 0; i < 6; i++)
        this.tone(1500 + Math.random() * 1200, 0.05, "sine", 0.07, Math.random() * 600 - 300, i * 0.07);
    } else {
      this.tone(1700, 0.3, "sawtooth", 0.08, -700);
      this.tone(1400, 0.24, "sawtooth", 0.06, -500, 0.12);
    }
  }

  // ── Encuentro / fotografía ──
  observe() { this.tone(700, 0.1, "sine", 0.12); this.tone(940, 0.14, "sine", 0.12, 0, 0.09); }
  shutter() { this.noise(0.05, 0.3, 3200); this.noise(0.09, 0.22, 1600, 0.05); }
  perfect() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, "square", 0.13, 0, i * 0.07)); }
  good() { this.tone(659, 0.1, "square", 0.12); this.tone(880, 0.14, "square", 0.12, 0, 0.08); }
  fail() { this.tone(330, 0.12, "square", 0.12, -80); this.tone(220, 0.2, "square", 0.11, -60, 0.1); }
  flee() { this.noise(0.3, 0.12, 800); this.tone(900, 0.25, "sine", 0.08, 600, 0.02); }
  newSpecies() { [660, 830, 990, 1320].forEach((f, i) => this.tone(f, 0.11, "triangle", 0.13, 0, i * 0.08)); }
  cebo() { this.noise(0.1, 0.08, 1800); this.tone(500, 0.08, "sine", 0.09, 120, 0.08); }
  victory() {
    const seq = [392, 523, 659, 784, 659, 784, 1047];
    seq.forEach((f, i) => this.tone(f, 0.16, "square", 0.13, 0, i * 0.13));
    seq.forEach((f, i) => this.tone(f / 2, 0.16, "triangle", 0.1, 0, i * 0.13));
  }
  observatory() { this.tone(440, 0.12, "triangle", 0.12); this.tone(554, 0.12, "triangle", 0.12, 0, 0.1); this.tone(659, 0.2, "triangle", 0.12, 0, 0.2); }

  // ── Ambiente: cantos aleatorios según la hora ──
  startAmbient(getPhase: () => "dawn" | "day" | "dusk" | "night", getScreen: () => string) {
    if (this.ambientTimer !== null) return;
    const tick = () => {
      const phase = getPhase();
      const screen = getScreen();
      if ((screen === "world" || screen === "victory") && !this.muted) {
        const density = phase === "dawn" ? 0.85 : phase === "day" ? 0.55 : phase === "dusk" ? 0.4 : 0.16;
        if (Math.random() < density) {
          const kind = phase === "night" ? 1 : Math.random() < 0.5 ? 0 : 2;
          this.chirp(kind as 0 | 1 | 2);
        }
      }
    };
    this.ambientTimer = window.setInterval(tick, 2400);
  }

  stopAmbient() {
    if (this.ambientTimer !== null) {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
  }
}
