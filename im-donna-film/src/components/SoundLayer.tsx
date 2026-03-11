import React from "react";
import { Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { CLAMP } from "../utils";
import { MUSIC_BED_START, PIANO_FRAME, VOL_PAD, VOL_PIANO, DURATION_FRAMES, FPS } from "../constants";

export const SoundLayer: React.FC = () => {
  const frame = useCurrentFrame();

  // Ambient pad volume: fade in from frame 24 over 96 frames
  const padVolume = interpolate(
    frame,
    [MUSIC_BED_START, MUSIC_BED_START + 96],
    [0, VOL_PAD],
    CLAMP
  );

  return (
    <>
      {/* Voiceover: full duration */}
      <Audio
        src={staticFile("audio/voiceover.mp3")}
        volume={1.0}
        startFrom={0}
      />

      {/* Ambient pad: looping music bed, starts at frame 24 */}
      {frame >= MUSIC_BED_START && (
        <Audio
          src={staticFile("audio/ambient_pad_warm_20s.wav")}
          volume={padVolume}
          startFrom={0}
          // Loop by re-mounting — handled via key cycling
          loop
        />
      )}

      {/* Piano note fires at PIANO_FRAME (0:39.2 — "I'm Donna." moment) */}
      {frame >= PIANO_FRAME && frame < PIANO_FRAME + 96 && (
        <Audio
          src={staticFile("audio/piano_note_middleC_4s.wav")}
          volume={VOL_PIANO}
          startFrom={0}
        />
      )}
    </>
  );
};
