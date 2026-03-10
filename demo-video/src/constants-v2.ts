// Donna Demo V2 — 30 second, snappy/kinetic, day-in-the-life

export const FPS = 30;
export const DURATION_SECONDS = 30;
export const DURATION_FRAMES = FPS * DURATION_SECONDS; // 900
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Scene frame ranges — tight, snappy cuts
export const SCENES = {
  wakeup:   { start: 0,   duration: 3 * FPS },   // 0-90     (3s)
  briefing: { start: 90,  duration: 5 * FPS },    // 90-240   (5s)
  ask:      { start: 240, duration: 5 * FPS },     // 240-390  (5s)
  action:   { start: 390, duration: 4 * FPS },     // 390-510  (4s)
  split:    { start: 510, duration: 5 * FPS },     // 510-660  (5s)
  tagline:  { start: 660, duration: 4 * FPS },     // 660-780  (4s)
  cta:      { start: 780, duration: 4 * FPS },     // 780-900  (4s)
} as const;

// Voiceover timing (start frame offset within each scene)
export const VO = {
  wakeup:   { file: 'vo/01-wakeup.mp3',   startInScene: 5 },
  briefing: { file: 'vo/02-briefing.mp3',  startInScene: 10 },
  ask:      { file: 'vo/03-ask.mp3',       startInScene: 8 },
  action:   { file: 'vo/04-action.mp3',    startInScene: 8 },
  split:    { file: 'vo/05-inbox.mp3',     startInScene: 8 },
  tagline:  { file: 'vo/06-tagline.mp3',   startInScene: 10 },
  cta:      { file: 'vo/07-cta.mp3',       startInScene: 15 },
} as const;

// Re-export brand colors
export { COLORS, NAV_ITEMS, FAKE_DATA } from './constants';
