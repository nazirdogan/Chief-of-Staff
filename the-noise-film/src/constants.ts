// ─── GLOBAL SPECS ────────────────────────────────────────────────────────────
export const FPS = 24;
export const DURATION_FRAMES = 1188; // 49.5 seconds
export const W = 1920;
export const H = 1080;

// ─── COLOURS ─────────────────────────────────────────────────────────────────
export const BG = "#080810";
export const TEXT_COLOR = "#F4E9D5";
export const ACCENT = "#C4914A";
export const SECONDARY_ACCENT = "#2B3A5C";
export const RED_DOT = "#E85D5D";

// ─── TYPOGRAPHY ──────────────────────────────────────────────────────────────
export const DISPLAY_FONT =
  '"Cormorant Garamond", "Georgia", serif';
export const UI_FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";

// ─── ACT 1 — THE FLOOD ───────────────────────────────────────────────────────
export const ACT1_START = 0;
export const FIRST_SPAWN = 24; // 0:01.00
export const FREEZE_FRAME = 432; // 0:18.00

// ─── ACT 2 — WHAT GETS LOST ──────────────────────────────────────────────────
export const ACT2_FREEZE_HOLD = 444; // 0:18.50 — blur begins
export const ACT2_BLUR_IN_END = 480; // 0:20.00

export const TARGET_A_MOVE_START = 480;
export const TARGET_A_MOVE_END = 516;
export const TARGET_A_TRANSFORM = 504;

export const TARGET_B_MOVE_START = 528;
export const TARGET_B_MOVE_END = 564;
export const TARGET_B_TRANSFORM = 552;

export const TARGET_C_MOVE_START = 576;
export const TARGET_C_MOVE_END = 612;
export const TARGET_C_TRANSFORM = 600;

export const LABELS_APPEAR_A = 672;
export const LABELS_APPEAR_B = 682;
export const LABELS_APPEAR_C = 692;

export const BASS_TONE_START = 636;
export const CENTRE_TEXT_APPEAR = 744;
export const ACT2_FADE_START = 804;
export const ACT2_END = 840;

export const TARGET_A_DEST = { x: 520, y: 480 };
export const TARGET_B_DEST = { x: 960, y: 460 };
export const TARGET_C_DEST = { x: 1400, y: 480 };

export const TARGET_A_SPAWN = { frame: 216, x: 780, y: 520, dx: 0, dy: -20, dur: 120 };
export const TARGET_B_SPAWN = { frame: 168, x: 1050, y: 450, dx: 0, dy: -20, dur: 120 };
export const TARGET_C_SPAWN = { frame: 264, x: 650, y: 380, dx: 0, dy: -15, dur: 120 };

// ─── ACT 3 — DONNA ───────────────────────────────────────────────────────────
export const ACT3_START = 840;
export const LIGHT_APPEAR = 852;       // 0:35.50
export const LIGHT_EXPAND_START = 888; // 0:37.00
export const BG_ELEM_SPAWN_START = 888;
export const LIGHT_MOVE_START = 936;   // 0:39.00
// At 0:41.00 (frame 984) the CTA opens and the light begins fading out
export const LIGHT_RETURN_START = 984; // 0:41.00 — light starts fading
export const ACT3_END = 1003;          // 0:41.80 — light fully faded (0.80s = ~19 frames)

// ─── CTA SEQUENCE (replaces Act 4) ───────────────────────────────────────────
// 0:41.00 – 0:49.50 (frames 984–1188)
export const FINAL_FRAME_START = 984;     // 0:41.00
export const FINAL_DONNA_APPEAR = 984;    // 0:41.00 — "DONNA" wordmark
export const FINAL_HEADING_APPEAR = 1008; // 0:42.00 — "she already knows"
export const FINAL_CTA_APPEAR = 1037;     // 0:43.20 — "Get Early Access" button
export const FINAL_URL_APPEAR = 1063;     // 0:44.30 — "imdonna.app"
export const PIANO_FRAME = 1080;          // 0:45.00 — piano note fires
export const FINAL_HOLD_END = 1188;       // 0:49.50 — film ends, hold on CTA

// ─── AUDIO VOLUMES (dB → linear) ─────────────────────────────────────────────
export const VOL_CHIME = 0.126;    // -18dB
export const VOL_HUM_MAX = 0.251;  // -12dB
export const VOL_BASS = 0.1;       // -20dB
export const VOL_PAD_START = 0.04; // -28dB
export const VOL_PAD_SWELL = 0.063; // -24dB
export const VOL_PIANO = 0.158;    // -16dB (spec says -18dB)
export const VOL_ROOM_TONE = 0.01; // -40dB
