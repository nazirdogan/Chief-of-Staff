// ─── GLOBAL SPECS ────────────────────────────────────────────────────────────
export const FPS = 24;
export const DURATION_FRAMES = 1440; // 60 seconds
export const W = 1920;
export const H = 1080;

// ─── COLOURS ─────────────────────────────────────────────────────────────────
export const BG = "#080810";
export const TEXT_COLOR = "#F4E9D5";
export const ACCENT = "#C4914A";
export const SECONDARY_ACCENT = "#2B3A5C";
export const RED_DOT = "#E85D5D";

// ─── TYPOGRAPHY ──────────────────────────────────────────────────────────────
// Freight Display Pro replaced with Helvetica Neue per user instruction
export const DISPLAY_FONT =
  '"Helvetica Neue", Helvetica, "Arial", sans-serif';
export const UI_FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";

// ─── EASING HELPERS ──────────────────────────────────────────────────────────
// Used by callers via Easing.* from remotion

// ─── ACT 1 — THE FLOOD ───────────────────────────────────────────────────────
export const ACT1_START = 0;
export const FIRST_SPAWN = 24; // 0:01.00
export const FREEZE_FRAME = 432; // 0:18.00

// ─── ACT 2 — WHAT GETS LOST ──────────────────────────────────────────────────
export const ACT2_FREEZE_HOLD = 444; // 0:18.50 — blur begins
export const ACT2_BLUR_IN_END = 480; // 0:20.00

// Target moves (1.5s = 36 frames each, staggered)
export const TARGET_A_MOVE_START = 480; // 0:20.00
export const TARGET_A_MOVE_END = 516; // 0:21.50
export const TARGET_A_TRANSFORM = 504; // 0:21.00

export const TARGET_B_MOVE_START = 528; // 0:22.00
export const TARGET_B_MOVE_END = 564; // 0:23.50
export const TARGET_B_TRANSFORM = 552; // 0:23.00

export const TARGET_C_MOVE_START = 576; // 0:24.00
export const TARGET_C_MOVE_END = 612; // 0:25.50
export const TARGET_C_TRANSFORM = 600; // 0:25.00

export const LABELS_APPEAR_A = 672; // 0:28.00
export const LABELS_APPEAR_B = 682; // 0:28.40 (≈)
export const LABELS_APPEAR_C = 692; // 0:28.80 (≈)

export const BASS_TONE_START = 636; // 0:26.50
export const CENTRE_TEXT_APPEAR = 744; // 0:31.00
export const ACT2_FADE_START = 804; // 0:33.50
export const ACT2_END = 840; // 0:35.00

// Target foreground destinations (centre coords)
export const TARGET_A_DEST = { x: 520, y: 480 };
export const TARGET_B_DEST = { x: 960, y: 460 };
export const TARGET_C_DEST = { x: 1400, y: 480 };

// Target spawn info (for frozen position calculation at frame 432)
// spawn, ix, iy, driftX, driftY, driftDur
export const TARGET_A_SPAWN = { frame: 216, x: 780, y: 520, dx: 0, dy: -20, dur: 120 };
export const TARGET_B_SPAWN = { frame: 168, x: 1050, y: 450, dx: 0, dy: -20, dur: 120 };
export const TARGET_C_SPAWN = { frame: 264, x: 650, y: 380, dx: 0, dy: -15, dur: 120 };

// ─── ACT 3 — DONNA ───────────────────────────────────────────────────────────
export const ACT3_START = 840;
export const LIGHT_APPEAR = 852; // 0:35.50
export const LIGHT_EXPAND_START = 888; // 0:37.00
export const BG_ELEM_SPAWN_START = 888; // 0:37.00
export const LIGHT_MOVE_START = 936; // 0:39.00
export const WORDMARK_ACT3 = 984; // 0:41.00
export const SUBLINE_ACT3 = 1008; // 0:42.00
export const LIGHT_JOURNEY_START = 1020; // 0:42.50
export const ACT3_WORDMARK_FADE_START = 1164; // 0:48.50
export const LAST_ELEMS_START = 1152; // 0:48.00
export const LIGHT_RETURN_START = 1188; // 0:49.50
export const ACT3_END = 1200; // 0:50.00

// ─── ACT 4 — THE SIGNAL ──────────────────────────────────────────────────────
export const ACT4_START = 1200;
export const ANCHOR_LINE_APPEAR = 1236; // 0:51.50
export const BRIEFING_LINE_1 = 1248; // 0:52.00
export const BRIEFING_LINE_2 = 1267; // 0:52.80 (≈)
export const BRIEFING_LINE_3 = 1286; // 0:53.60 (≈)
export const BRIEFING_HOLD_END = 1306; // 0:54.40
export const PIANO_FRAME = 1320; // 0:55.00
export const FINAL_LINE_APPEAR = 1320; // 0:55.00
export const BRIEFING_FADE_START = 1380; // 0:57.50
export const HOLD_BLACK = 1404; // 0:58.50
export const FINAL_WORDMARK = 1416; // 0:59.00
export const FILM_END = 1440; // 1:00.00

// ─── AUDIO VOLUMES (dB → linear) ─────────────────────────────────────────────
// dB to linear: 10^(dB/20)
export const VOL_CHIME = 0.126; // -18dB
export const VOL_HUM_MAX = 0.251; // -12dB
export const VOL_BASS = 0.1; // -20dB
export const VOL_PAD_START = 0.04; // -28dB
export const VOL_PAD_SWELL = 0.063; // -24dB
export const VOL_PIANO = 0.158; // -16dB
export const VOL_ROOM_TONE = 0.01; // -40dB
