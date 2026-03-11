export const FPS = 24;
export const DURATION_FRAMES = 1152; // 48s = 40.31s VO + 7.7s logo hold
export const W = 1920;
export const H = 1080;
export const V_W = 1080;
export const V_H = 1920;

export const BG = "#080810";
export const IVORY = "#F4E9D5";
export const AMBER = "#C4914A";
export const NAVY = "#1A1A2E";

export const DISPLAY_FONT = '"Cormorant Garamond", Georgia, serif';
export const UI_FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";

// ── Sequence frame ranges ──────────────────────────────────────────────────
export const SEQ1_END = 140;         // 0:05.8
export const SEQ2_START = 140;
export const SEQ2_CLEAR = 284;       // 0:11.8 — all text clears
export const SEQ2_END = 390;         // 0:16.3
export const SEQ3_START = 386;       // 0:16.1
export const SEQ3_END = 580;         // 0:24.2
export const SEQ4_START = 526;       // 0:21.9 (overlaps seq3 tail)
export const SEQ4_END = 640;         // 0:26.7
export const SEQ5_START = 631;       // 0:26.3
export const SEQ5_END = 790;         // 0:32.9
export const SEQ6_START = 786;       // 0:32.75
export const SEQ6_END = 968;         // 0:40.3 (VO end)
export const SEQ7_START = 940;       // 0:39.2 ("I'm Donna." moment)
export const SEQ7_END = 1152;        // 0:48.0

// ── DonnaHeader lifecycle ──────────────────────────────────────────────────
export const DONNA_APPEAR = 41;       // 0:01.7 — "Donna." as phrase word
export const DONNA_MIG1_START = 62;   // 0:02.6 — "My name is" fades, Donna migrates
export const DONNA_MIG1_END = 77;     // 0:03.2 — intermediate position
export const DONNA_MIG2_START = 140;  // 0:05.8 — moves to top header
export const DONNA_MIG2_END = 154;    // 0:06.4
export const DONNA_HDR_X = 960;
export const DONNA_HDR_Y = 120;
export const DONNA_CLOSE_START = 940; // 0:39.2 — "I'm Donna." moment
export const DONNA_CLOSE_END = 959;   // 0:40.0
export const DONNA_CLOSE_Y = 510;
export const SUBLINE_APPEAR = 975;    // 0:40.6
export const SUBLINE_FADE_IN_END = 990; // 0:41.3

export const MNIS_FADE = 62;

// CTA end card
export const CTA_APPEAR = 1020;
export const URL_APPEAR = 1048;

// ── Audio ──────────────────────────────────────────────────────────────────
export const MUSIC_BED_START = 24;
export const PIANO_FRAME = 940;      // fires when "I'm Donna." lands
export const VOL_PAD = 0.04;
export const VOL_PIANO = 0.126;
