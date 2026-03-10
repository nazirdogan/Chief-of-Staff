// Donna Demo V3 — 60 second, screen-by-screen feature tour, kinetic style

export const FPS = 30;
export const DURATION_SECONDS = 60;
export const DURATION_FRAMES = FPS * DURATION_SECONDS; // 1800
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Scene frame ranges — 10 scenes
export const SCENES = {
  intro:        { start: 0,    duration: 4 * FPS },    // 0-120     (4s)
  briefing:     { start: 120,  duration: 7 * FPS },    // 120-330   (7s)
  chat:         { start: 330,  duration: 7 * FPS },    // 330-540   (7s)
  inbox:        { start: 540,  duration: 7 * FPS },    // 540-750   (7s)
  commitments:  { start: 750,  duration: 6 * FPS },    // 750-930   (6s)
  people:       { start: 930,  duration: 6 * FPS },    // 930-1110  (6s)
  autonomy:     { start: 1110, duration: 6 * FPS },    // 1110-1290 (6s)
  integrations: { start: 1290, duration: 6 * FPS },    // 1290-1470 (6s)
  tagline:      { start: 1470, duration: 5 * FPS },    // 1470-1620 (5s)
  cta:          { start: 1620, duration: 6 * FPS },    // 1620-1800 (6s)
} as const;

// Voiceover
export const VO = {
  intro:        { file: 'vo/v3-01-intro.mp3',        startInScene: 5 },
  briefing:     { file: 'vo/v3-02-briefing.mp3',     startInScene: 10 },
  chat:         { file: 'vo/v3-03-chat.mp3',         startInScene: 8 },
  inbox:        { file: 'vo/v3-04-inbox.mp3',        startInScene: 8 },
  commitments:  { file: 'vo/v3-05-commitments.mp3',  startInScene: 8 },
  people:       { file: 'vo/v3-06-people.mp3',       startInScene: 8 },
  autonomy:     { file: 'vo/v3-07-autonomy.mp3',     startInScene: 8 },
  integrations: { file: 'vo/v3-08-integrations.mp3', startInScene: 8 },
  tagline:      { file: 'vo/v3-09-tagline.mp3',      startInScene: 15 },
  cta:          { file: 'vo/v3-10-cta.mp3',          startInScene: 20 },
} as const;

export { COLORS, NAV_ITEMS, FAKE_DATA } from './constants';
