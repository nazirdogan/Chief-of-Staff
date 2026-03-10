// Donna Demo V7 — 30 second, stylized, vertical 9:16 (Reels/Stories)

export const FPS = 30;
export const DURATION_SECONDS = 30;
export const DURATION_FRAMES = FPS * DURATION_SECONDS; // 900
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const SCENES = {
  intro:     { start: 0,   duration: 2 * FPS },
  briefing:  { start: 60,  duration: 4 * FPS },
  chat:      { start: 180, duration: 4 * FPS },
  montage:   { start: 300, duration: 6 * FPS },
  autonomy:  { start: 480, duration: 4 * FPS },
  tagline:   { start: 600, duration: 4 * FPS },
  cta:       { start: 720, duration: 6 * FPS },
} as const;

// Reuse V4 voiceover
export const VO = {
  intro:     { file: 'vo/v4-01-intro.mp3',     startInScene: 3 },
  briefing:  { file: 'vo/v4-02-briefing.mp3',  startInScene: 5 },
  chat:      { file: 'vo/v4-03-chat.mp3',      startInScene: 5 },
  montage:   { file: 'vo/v4-04-montage.mp3',   startInScene: 5 },
  autonomy:  { file: 'vo/v4-05-autonomy.mp3',  startInScene: 5 },
  tagline:   { file: 'vo/v4-06-tagline.mp3',   startInScene: 10 },
  cta:       { file: 'vo/v4-07-cta.mp3',       startInScene: 15 },
} as const;

export { COLORS } from './constants';
