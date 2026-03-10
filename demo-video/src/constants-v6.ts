// Donna Demo V6 — 30 second, stylized motion graphics, clean & minimal

export const FPS = 30;
export const DURATION_SECONDS = 30;
export const DURATION_FRAMES = FPS * DURATION_SECONDS; // 900
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const SCENES = {
  intro:     { start: 0,   duration: 2 * FPS },    // 0-60     (2s)
  briefing:  { start: 60,  duration: 4 * FPS },    // 60-180   (4s)
  chat:      { start: 180, duration: 4 * FPS },    // 180-300  (4s)
  montage:   { start: 300, duration: 6 * FPS },    // 300-480  (6s)
  autonomy:  { start: 480, duration: 4 * FPS },    // 480-600  (4s)
  tagline:   { start: 600, duration: 4 * FPS },    // 600-720  (4s)
  cta:       { start: 720, duration: 6 * FPS },    // 720-900  (6s)
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
