import { SpawnableElement, ElementType } from "./types";

// ─── SEEDED RANDOM ────────────────────────────────────────────────────────────
class LCG {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    this.s = (Math.imul(1664525, this.s) + 1013904223) >>> 0;
    return this.s / 0xffffffff;
  }
  range(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }
  int(lo: number, hi: number): number {
    return Math.floor(this.range(lo, hi + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
}

function frozenPos(
  spawnFrame: number,
  x: number,
  y: number,
  dx: number,
  dy: number,
  dur: number,
  atFrame = 432
): { x: number; y: number } {
  const elapsed = Math.max(0, atFrame - spawnFrame);
  const p = Math.min(elapsed / dur, 1);
  return { x: x + dx * p, y: y + dy * p };
}

// ─── EXPLICITLY SPECIFIED ELEMENTS (from production doc) ─────────────────────
const EXPLICIT: SpawnableElement[] = [
  // 0:01.00 — first email, canvas centre
  {
    id: "e001",
    type: "email",
    spawnFrame: 24,
    x: 960,
    y: 540,
    driftX: 0,
    driftY: -20,
    driftDur: 120,
  },
  // 0:01.20
  {
    id: "e002",
    type: "email",
    spawnFrame: 29,
    x: 720,
    y: 440,
    driftX: -10,
    driftY: -25,
    driftDur: 144,
  },
  // 0:01.50
  {
    id: "e003",
    type: "calendar",
    spawnFrame: 36,
    x: 1160,
    y: 480,
    driftX: 20,
    driftY: -20,
    driftDur: 144,
  },
  // 0:02.00
  {
    id: "e004",
    type: "bubble",
    spawnFrame: 48,
    x: 820,
    y: 620,
    driftX: 0,
    driftY: -25,
    driftDur: 120,
  },
  // 0:02.33
  {
    id: "e005",
    type: "pill",
    spawnFrame: 56,
    x: 1100,
    y: 650,
    driftX: 20,
    driftY: -25,
    driftDur: 120,
  },
  // 0:02.66
  {
    id: "e006",
    type: "email",
    spawnFrame: 64,
    x: 600,
    y: 560,
    driftX: 0,
    driftY: -25,
    driftDur: 120,
  },
  // 0:03.00 — dots ×3
  {
    id: "d001",
    type: "dot",
    spawnFrame: 72,
    x: 400,
    y: 300,
    driftX: 10,
    driftY: -10,
    driftDur: 144,
  },
  {
    id: "d002",
    type: "dot",
    spawnFrame: 72,
    x: 1300,
    y: 700,
    driftX: -10,
    driftY: 10,
    driftDur: 144,
  },
  {
    id: "d003",
    type: "dot",
    spawnFrame: 72,
    x: 850,
    y: 200,
    driftX: 0,
    driftY: 15,
    driftDur: 120,
  },
  // 0:03.20 — text fragment
  {
    id: "t001",
    type: "text",
    spawnFrame: 77,
    x: 680,
    y: 350,
    driftX: 5,
    driftY: -10,
    driftDur: 120,
    text: "just circling back—",
    textOpacity: 0.55,
  },
  // 0:03.50
  {
    id: "e007",
    type: "calendar",
    spawnFrame: 84,
    x: 350,
    y: 680,
    driftX: 10,
    driftY: -20,
    driftDur: 120,
  },
  // 0:03.70
  {
    id: "e008",
    type: "bubble",
    spawnFrame: 89,
    x: 1250,
    y: 350,
    driftX: -15,
    driftY: -20,
    driftDur: 120,
  },
  // 0:04.00
  {
    id: "e009",
    type: "email",
    spawnFrame: 96,
    x: 500,
    y: 750,
    driftX: 0,
    driftY: -25,
    driftDur: 120,
  },
  // 0:04.20
  {
    id: "t002",
    type: "text",
    spawnFrame: 101,
    x: 1150,
    y: 580,
    driftX: -10,
    driftY: 15,
    driftDur: 120,
    text: "per my last—",
    textOpacity: 0.55,
  },
  // 0:04.50
  {
    id: "e010",
    type: "pill",
    spawnFrame: 108,
    x: 750,
    y: 300,
    driftX: 20,
    driftY: -15,
    driftDur: 144,
  },
  // 0:04.80
  {
    id: "e011",
    type: "email",
    spawnFrame: 115,
    x: 1350,
    y: 500,
    driftX: -20,
    driftY: 10,
    driftDur: 120,
  },
  // 0:05.10
  {
    id: "t003",
    type: "text",
    spawnFrame: 122,
    x: 920,
    y: 720,
    driftX: 5,
    driftY: -15,
    driftDur: 120,
    text: "following up on—",
    textOpacity: 0.55,
  },
  // 0:05.40
  {
    id: "t004",
    type: "text",
    spawnFrame: 130,
    x: 430,
    y: 450,
    driftX: 10,
    driftY: -20,
    driftDur: 120,
    text: "when you get a chance—",
    textOpacity: 0.55,
  },
  // 0:06.00
  {
    id: "t005",
    type: "text",
    spawnFrame: 144,
    x: 1280,
    y: 420,
    driftX: -15,
    driftY: 10,
    driftDur: 120,
    text: "as discussed—",
    textOpacity: 0.5,
  },
  // 0:06.50
  {
    id: "t006",
    type: "text",
    spawnFrame: 156,
    x: 760,
    y: 180,
    driftX: 5,
    driftY: 25,
    driftDur: 120,
    text: "just a quick ping—",
    textOpacity: 0.5,
  },
  // 0:07.00 — TARGET B pre-seeded
  {
    id: "targetB",
    type: "pill",
    spawnFrame: 168,
    x: 1050,
    y: 450,
    driftX: 0,
    driftY: -20,
    driftDur: 120,
    isTargetB: true,
  },
  // 0:07.00 — text fragment (different position)
  {
    id: "t007",
    type: "text",
    spawnFrame: 168,
    x: 1050,
    y: 780,
    driftX: -10,
    driftY: -15,
    driftDur: 120,
    text: "looping you in—",
    textOpacity: 0.5,
  },
  // 0:07.50
  {
    id: "t008",
    type: "text",
    spawnFrame: 180,
    x: 560,
    y: 620,
    driftX: 15,
    driftY: -10,
    driftDur: 120,
    text: "any update on—",
    textOpacity: 0.45,
  },
  // 0:08.50 — text fragment
  {
    id: "t009",
    type: "text",
    spawnFrame: 204,
    x: 870,
    y: 650,
    driftX: 5,
    driftY: -10,
    driftDur: 120,
    text: "can we connect—",
    textOpacity: 0.45,
  },
  // 0:09.00 — TARGET A pre-seeded
  {
    id: "targetA",
    type: "bubble",
    spawnFrame: 216,
    x: 780,
    y: 520,
    driftX: 0,
    driftY: -20,
    driftDur: 120,
    isTargetA: true,
  },
  // 0:09.00 — text fragment
  {
    id: "t010",
    type: "text",
    spawnFrame: 216,
    x: 300,
    y: 380,
    driftX: 20,
    driftY: -15,
    driftDur: 120,
    text: "hope this finds you—",
    textOpacity: 0.45,
  },
  // 0:09.50
  {
    id: "t011",
    type: "text",
    spawnFrame: 228,
    x: 1350,
    y: 280,
    driftX: -10,
    driftY: 20,
    driftDur: 120,
    text: "just wanted to check—",
    textOpacity: 0.45,
  },
  // 0:10.00
  {
    id: "t012",
    type: "text",
    spawnFrame: 240,
    x: 650,
    y: 820,
    driftX: 15,
    driftY: -10,
    driftDur: 120,
    text: "still waiting to hear—",
    textOpacity: 0.45,
  },
  // 0:10.50
  {
    id: "t013",
    type: "text",
    spawnFrame: 252,
    x: 1100,
    y: 140,
    driftX: -20,
    driftY: 20,
    driftDur: 120,
    text: "touching base—",
    textOpacity: 0.45,
  },
  // 0:11.00 — TARGET C pre-seeded
  {
    id: "targetC",
    type: "contactCard",
    spawnFrame: 264,
    x: 650,
    y: 380,
    driftX: 0,
    driftY: -15,
    driftDur: 120,
    isTargetC: true,
  },
  // 0:11.00 — text fragment
  {
    id: "t014",
    type: "text",
    spawnFrame: 264,
    x: 490,
    y: 230,
    driftX: 10,
    driftY: 15,
    driftDur: 120,
    text: "following up again—",
    textOpacity: 0.45,
  },
  // 0:11.50
  {
    id: "t015",
    type: "text",
    spawnFrame: 276,
    x: 1200,
    y: 680,
    driftX: -15,
    driftY: -20,
    driftDur: 120,
    text: "did you see my last—",
    textOpacity: 0.45,
  },
  // 0:17.00 — final three text fragments (last before freeze)
  {
    id: "t_final1",
    type: "text",
    spawnFrame: 408,
    x: 740,
    y: 460,
    driftX: 5,
    driftY: -10,
    driftDur: 48,
    text: "I promised I would—",
    textOpacity: 0.65,
  },
  {
    id: "t_final2",
    type: "text",
    spawnFrame: 408,
    x: 1050,
    y: 320,
    driftX: -5,
    driftY: -15,
    driftDur: 48,
    text: "they're still waiting—",
    textOpacity: 0.65,
  },
  {
    id: "t_final3",
    type: "text",
    spawnFrame: 408,
    x: 580,
    y: 640,
    driftX: 10,
    driftY: -8,
    driftDur: 48,
    text: "I meant to send—",
    textOpacity: 0.65,
  },
];

// ─── CHAOS ELEMENT GENERATOR ──────────────────────────────────────────────────
function genChaos(
  count: number,
  startFrame: number,
  endFrame: number,
  seed: number,
  types: ElementType[]
): SpawnableElement[] {
  const rng = new LCG(seed);
  const frameRange = endFrame - startFrame;

  return Array.from({ length: count }, (_, i) => {
    const type = rng.pick(types);
    const x = Math.round(rng.range(200, 1720));
    const y = Math.round(rng.range(150, 930));
    const driftX = Math.round(rng.range(-25, 25));
    const driftY = Math.round(rng.range(-25, 25));
    const driftDur = Math.round(rng.range(4 * 24, 6 * 24));
    const spawnFrame =
      startFrame + Math.floor((i / count) * frameRange);

    return {
      id: `chaos-${seed}-${i}`,
      type,
      spawnFrame,
      x,
      y,
      driftX,
      driftY,
      driftDur,
    };
  });
}

// Generate dot clusters (groups of 2-3 dots at same spawn frame)
function genDotClusters(
  clusterCount: number,
  startFrame: number,
  endFrame: number,
  seed: number
): SpawnableElement[] {
  const rng = new LCG(seed);
  const result: SpawnableElement[] = [];
  for (let c = 0; c < clusterCount; c++) {
    const spawnFrame =
      startFrame + Math.floor((c / clusterCount) * (endFrame - startFrame));
    const dotsInCluster = rng.int(2, 3);
    for (let d = 0; d < dotsInCluster; d++) {
      result.push({
        id: `dotcluster-${seed}-${c}-${d}`,
        type: "dot",
        spawnFrame,
        x: Math.round(rng.range(200, 1720)),
        y: Math.round(rng.range(150, 930)),
        driftX: Math.round(rng.range(-20, 20)),
        driftY: Math.round(rng.range(-20, 20)),
        driftDur: Math.round(rng.range(4 * 24, 6 * 24)),
      });
    }
  }
  return result;
}

// Generate rapid dot bursts (5-8 dots/sec from 0:15 = frame 360)
function genRapidDots(
  seed: number
): SpawnableElement[] {
  const rng = new LCG(seed);
  const result: SpawnableElement[] = [];
  // frame 360-408: ~7 bursts of 6 dots each
  for (let b = 0; b < 7; b++) {
    const spawnFrame = 360 + b * 7; // roughly one burst every 7 frames (~3/sec groups)
    const count = rng.int(5, 8);
    for (let d = 0; d < count; d++) {
      result.push({
        id: `rapid-dot-${seed}-${b}-${d}`,
        type: "dot",
        spawnFrame,
        x: Math.round(rng.range(150, 1770)),
        y: Math.round(rng.range(80, 1000)),
        driftX: Math.round(rng.range(-15, 15)),
        driftY: Math.round(rng.range(-15, 15)),
        driftDur: Math.round(rng.range(3 * 24, 5 * 24)),
      });
    }
  }
  return result;
}

// Phase A: 0:08-0:12 (frames 192-288) — 4-5 elements/sec
const CHAOS_A = genChaos(
  20,
  192,
  288,
  0xdeadbeef,
  ["email", "calendar", "bubble", "pill", "email", "calendar"]
);

// Phase A dot clusters
const CHAOS_A_DOTS = genDotClusters(8, 192, 288, 0xaabb1234);

// Phase B: 0:12-0:17 (frames 288-408) — 6-8 elements/sec
const CHAOS_B = genChaos(
  38,
  288,
  408,
  0xcafebabe,
  ["email", "calendar", "bubble", "pill", "email"]
);

// Phase B dot clusters (denser)
const CHAOS_B_DOTS = genDotClusters(14, 288, 360, 0x12345678);

// Rapid dots 0:15-0:17
const RAPID_DOTS = genRapidDots(0x99887766);

export const ALL_ELEMENTS: SpawnableElement[] = [
  ...EXPLICIT,
  ...CHAOS_A,
  ...CHAOS_A_DOTS,
  ...CHAOS_B,
  ...CHAOS_B_DOTS,
  ...RAPID_DOTS,
];

// Export frozen positions for Act 2 targets
export const TARGET_A_FROZEN = frozenPos(
  216, 780, 520, 0, -20, 120
);
export const TARGET_B_FROZEN = frozenPos(
  168, 1050, 450, 0, -20, 120
);
export const TARGET_C_FROZEN = frozenPos(
  264, 650, 380, 0, -15, 120
);

export { frozenPos };
