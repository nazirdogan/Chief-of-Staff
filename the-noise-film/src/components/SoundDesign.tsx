import React from "react";
import { Sequence, staticFile, interpolate } from "remotion";
import { Audio } from "@remotion/media";
import {
  FPS,
  VOL_CHIME, VOL_HUM_MAX, VOL_BASS, VOL_PAD_START, VOL_PIANO,
  BASS_TONE_START, ACT2_FADE_START,
  LIGHT_APPEAR, LIGHT_RETURN_START, ACT3_END,
  PIANO_FRAME,
} from "../constants";
import { CLAMP } from "../utils";

// ─── CHIME SEQUENCE ───────────────────────────────────────────────────────────
const CHIME_SPAWNS: Array<{ frame: number; variant: number }> = [
  { frame: 24, variant: 1 },
  { frame: 29, variant: 2 },
  { frame: 36, variant: 3 },
  { frame: 48, variant: 4 },
  { frame: 56, variant: 5 },
  { frame: 64, variant: 1 },
  { frame: 72, variant: 2 },
  { frame: 77, variant: 3 },
  { frame: 84, variant: 4 },
  { frame: 89, variant: 5 },
  { frame: 96, variant: 1 },
  { frame: 101, variant: 2 },
  { frame: 108, variant: 3 },
  { frame: 115, variant: 4 },
  { frame: 122, variant: 5 },
  { frame: 130, variant: 1 },
  { frame: 144, variant: 2 },
  { frame: 156, variant: 3 },
  { frame: 168, variant: 4 },
  { frame: 180, variant: 5 },
  { frame: 192, variant: 1 },
  { frame: 200, variant: 2 },
  { frame: 210, variant: 3 },
  { frame: 222, variant: 4 },
  { frame: 236, variant: 5 },
  { frame: 248, variant: 1 },
  { frame: 260, variant: 2 },
  { frame: 272, variant: 3 },
  { frame: 288, variant: 4 },
];

const CHIME_FILES: Record<number, string> = {
  1: "audio/chime_01_C6.wav",
  2: "audio/chime_02_E6.wav",
  3: "audio/chime_03_G6.wav",
  4: "audio/chime_04_A5.wav",
  5: "audio/chime_05_Bb5.wav",
};

// ─── MAIN SOUND DESIGN ────────────────────────────────────────────────────────
export const SoundDesign: React.FC = () => {
  return (
    <>
      {/* ── Individual chimes (Act 1) ── */}
      {CHIME_SPAWNS.map(({ frame, variant }, idx) => (
        <Sequence key={`chime-${idx}`} from={frame} durationInFrames={10}>
          <Audio
            src={staticFile(CHIME_FILES[variant])}
            volume={VOL_CHIME}
          />
        </Sequence>
      ))}

      {/* ── 80Hz ambient hum (fades in 0:08→0:18, hard cut at 0:18) ── */}
      <Sequence from={8 * FPS} durationInFrames={10 * FPS}>
        <Audio
          src={staticFile("audio/80hz_ambient_hum_30s.wav")}
          volume={(f) =>
            interpolate(f, [0, 10 * FPS], [0, VOL_HUM_MAX], { ...CLAMP })
          }
        />
      </Sequence>

      {/* ── 120Hz bass tone (0:26.50 → 0:35.00) ── */}
      <Sequence
        from={BASS_TONE_START}
        durationInFrames={ACT2_FADE_START - BASS_TONE_START + 24}
      >
        <Audio
          src={staticFile("audio/120hz_bass_tone_10s.wav")}
          volume={(f) => {
            const fadeIn = interpolate(f, [0, 72], [0, VOL_BASS], { ...CLAMP });
            const totalDur = ACT2_FADE_START - BASS_TONE_START + 24;
            const fadeOut = interpolate(f, [totalDur - 24, totalDur], [1, 0], { ...CLAMP });
            return fadeIn * fadeOut;
          }}
        />
      </Sequence>

      {/* ── Warm ambient pad (Act 3: 0:36.00 → 0:41.00 when CTA opens) ── */}
      <Sequence
        from={LIGHT_APPEAR + 10}
        durationInFrames={ACT3_END - (LIGHT_APPEAR + 10)}
      >
        <Audio
          src={staticFile("audio/ambient_pad_warm_20s.wav")}
          loop
          volume={(f) => {
            const totalDur = ACT3_END - (LIGHT_APPEAR + 10);
            const fadeIn = interpolate(f, [0, 24], [0, VOL_PAD_START], { ...CLAMP });
            // Fade out when CTA opens
            const fadeOutStart = LIGHT_RETURN_START - (LIGHT_APPEAR + 10);
            const fadeOut = interpolate(f, [fadeOutStart, totalDur], [1, 0], { ...CLAMP });
            return fadeIn * fadeOut;
          }}
        />
      </Sequence>

      {/* ── Piano note (0:45.00 — single shot) ── */}
      <Sequence from={PIANO_FRAME} durationInFrames={96}>
        <Audio
          src={staticFile("audio/piano_note_middleC_4s.wav")}
          volume={VOL_PIANO}
        />
      </Sequence>

      {/* ── Voiceover — Rachelle narration, full film ── */}
      <Sequence from={0} durationInFrames={1188}>
        <Audio
          src={staticFile("audio/voiceover.mp3")}
          volume={1}
        />
      </Sequence>
    </>
  );
};
