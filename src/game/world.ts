// ─── Mapa de las Marismas del Odiel (48×36 teselas) ─────────────────────────
// Leyenda:
//  .  sendero        ,  fangal         R  carrizal       S  matorral
//  T  taraje (árbol) A  arena/sal     ~  agua somera    W  agua profunda
//  L  lámina salina  P  pasarela      C  cartel         B  observatorio

export const MAP_W = 48;
export const MAP_H = 36;

function buildMap(): string[] {
  const g: string[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill("."));
  const fill = (x0: number, y0: number, x1: number, y1: number, ch: string) => {
    for (let y = Math.max(0, y0); y <= Math.min(MAP_H - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(MAP_W - 1, x1); x++) g[y][x] = ch;
  };

  // Mar y playa (norte)
  fill(0, 0, 47, 0, "W");
  fill(0, 1, 47, 1, "A");

  // Salinas: láminas de agua entre banquetas de arena
  fill(0, 2, 47, 7, "A");
  fill(2, 2, 11, 3, "L"); fill(15, 2, 24, 3, "L"); fill(28, 2, 37, 3, "L"); fill(41, 2, 46, 3, "L");
  fill(4, 5, 13, 6, "L"); fill(17, 5, 26, 6, "L"); fill(30, 5, 39, 6, "L"); fill(43, 5, 46, 6, "L");
  fill(0, 4, 47, 4, "."); // camino que cruza las salinas

  // Carrizal (oeste)
  fill(0, 10, 8, 24, "R");
  fill(4, 10, 4, 24, ".");
  fill(0, 20, 8, 20, ".");

  // Fangal (centro)
  fill(13, 12, 33, 24, ",");

  // Matorral (este) con tarajes
  fill(38, 10, 47, 26, "S");
  fill(42, 10, 42, 26, ".");
  [[39, 11], [45, 12], [40, 19], [46, 21], [38, 24], [44, 17], [41, 25]].forEach(([x, y]) => { g[y][x] = "T"; });

  // Senderos principales
  fill(0, 8, 47, 8, ".");
  fill(0, 16, 47, 16, ".");
  fill(22, 9, 22, 26, ".");
  fill(10, 9, 10, 26, ".");
  fill(35, 9, 35, 26, ".");

  // Ribera y ría (sur) con pasarela
  fill(0, 27, 47, 27, "A");
  fill(0, 28, 47, 28, "~");
  fill(0, 29, 47, 35, "W");
  fill(23, 24, 24, 35, "P");

  // Carteles y observatorios (bloqueo + interacción)
  g[15][22] = "C"; // entrada
  g[5][13] = "C";  // salinas
  g[16][41] = "C"; // matorral
  g[27][26] = "C"; // pasarela
  g[16][2] = "B";  // observatorio del carrizal
  g[26][36] = "B"; // observatorio de la ría

  return g.map((row) => row.join(""));
}

export const MAP: string[] = buildMap();

export const SPAWN: [number, number] = [22, 16];

// Flamencos sobre las láminas salinas (posiciones decorativas)
export const FLAMINGOS: [number, number][] = [
  [5, 2], [8, 3], [18, 2], [21, 3], [32, 2], [7, 5], [20, 6], [34, 6],
];

export interface Sign { x: number; y: number; title: string; text: string; }

export const SIGNS: Sign[] = [
  {
    x: 22, y: 15,
    title: "Paraje Natural Marismas del Odiel",
    text: "Reserva de la Biosfera y Zona de Especial Protección para las Aves. Más de 200 especies se han citado en este laberinto de caños, salinas y carrizales.",
  },
  {
    x: 13, y: 5,
    title: "Salinas del Astur",
    text: "La sal se cosechaba aquí desde época romana. Hoy son los flamencos y las espátulas quienes trabajan estas aguas someras, filtrando artemias con el pico.",
  },
  {
    x: 41, y: 16,
    title: "El matorral de la marisma",
    text: "Entre lentiscos y retamas viven los pájaros pequeños. En invierno, bandadas de jilgueros —el «colorín» de Huelva— bajan a comer semillas de cardo.",
  },
  {
    x: 26, y: 27,
    title: "Pasarela sobre la ría",
    text: "Con marea baja, las limícolas peinan el fango buscando cangrejos. Con marea alta, charranes y gaviotas pescan en el agua abierta. Pasa despacio.",
  },
];

export const GENERIC_SIGN = "Un cartel antiguo del paraje. La sal y el sol han borrado el texto.";

// ─── Semántica de teselas ───────────────────────────────────────────────────
export type Zone = "carrizal" | "fangal" | "matorral" | "agua";

export function isBlocking(ch: string): boolean {
  return ch === "W" || ch === "L" || ch === "T" || ch === "C" || ch === "B";
}

export function zoneOf(ch: string): Zone | null {
  if (ch === "R") return "carrizal";
  if (ch === "," || ch === "A") return "fangal";
  if (ch === "S") return "matorral";
  if (ch === "~" || ch === "P") return "agua";
  return null;
}

export const ZONE_NAME: Record<Zone, string> = {
  carrizal: "Carrizal",
  fangal: "Fangal y salinas",
  matorral: "Matorral",
  agua: "Ría y pasarelas",
};

export const ZONE_FLAVOR: Record<string, string> = {
  "Carrizal": "Carrizal — crujen las cañas: territorio de gallinetas y garzas.",
  "Fangal y salinas": "Fangal — la marea baja deja al descubierto el comedor de las limícolas.",
  "Matorral": "Matorral — entre lentiscos y retamas cantan los pájaros pequeños.",
  "Ría y pasarelas": "Ría — charranes y gaviotas patrullan el agua abierta.",
  "Sendero del Odiel": "Sendero del Odiel — cruza entre hábitats para encontrar aves.",
};

export function zoneNameAt(ch: string): string {
  const z = zoneOf(ch);
  return z ? ZONE_NAME[z] : "Sendero del Odiel";
}

// ─── Tablas de encuentro por hábitat ────────────────────────────────────────
export const ENCOUNTERS: Record<Zone, string[]> = {
  carrizal: ["ciguena-blanca", "gallineta", "garza-real", "aguilucho", "espatula", "zarapito"],
  fangal: ["zarapito", "vuelvepiedras", "chorlitejo", "espatula", "avoceta", "aguilucho"],
  matorral: ["petirrojo", "mirlo", "jilguero", "aguilucho", "ciguena-blanca"],
  agua: ["gaviota-reidora", "charrancito", "charran", "garceta", "cormoran", "flamenco", "garza-real", "aguila-pescadora"],
};
