import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { CLAMP, easeOutCubic, easeOutQuad } from "../utils";
import {
  AMBER,
  IVORY,
  DISPLAY_FONT,
  DONNA_APPEAR,
  DONNA_MIG1_START,
  DONNA_MIG1_END,
  DONNA_MIG2_START,
  DONNA_MIG2_END,
  DONNA_HDR_X,
  DONNA_HDR_Y,
  DONNA_CLOSE_START,
  DONNA_CLOSE_END,
  DONNA_CLOSE_Y,
  SUBLINE_APPEAR,
  SUBLINE_FADE_IN_END,
} from "../constants";

export const DonnaHeader: React.FC = () => {
  const frame = useCurrentFrame();

  if (frame < DONNA_APPEAR) return null;

  // ── Compute X, Y, fontSize, opacity, letterSpacing across all phases ──────

  let x: number;
  let y: number;
  let fontSize: number;
  let opacity: number;
  let letterSpacing: string;
  let scale = 1;

  // Phase 1: Phrase word (frames 41–62) - appears at X:1060, Y:520
  // settle: +8px Y over 6 frames
  const settleY = interpolate(
    frame,
    [DONNA_APPEAR, DONNA_APPEAR + 6],
    [8, 0],
    CLAMP
  );

  if (frame < DONNA_MIG1_START) {
    x = 1060;
    y = 520 + settleY;
    fontSize = 52;
    opacity = interpolate(frame, [DONNA_APPEAR, DONNA_APPEAR + 6], [0, 1], CLAMP);
    letterSpacing = "-0.01em";
  } else if (frame <= DONNA_MIG1_END) {
    // Migration 1: X:1060→960, Y:520→460, fontSize 52→80, letterSpacing changes
    const t = (frame - DONNA_MIG1_START) / (DONNA_MIG1_END - DONNA_MIG1_START);
    const ease = easeOutCubic(t);
    x = 1060 + (960 - 1060) * ease;
    y = 520 + (460 - 520) * ease;
    fontSize = 52 + (80 - 52) * ease;
    opacity = 1;
    letterSpacing = `${(-0.01 + (0.15 - (-0.01)) * ease).toFixed(3)}em`;
  } else if (frame < DONNA_MIG2_START) {
    // Phase 2: Intermediate header (77–192)
    x = 960;
    y = 460;
    fontSize = 80;
    opacity = 1;
    letterSpacing = "0.15em";
  } else if (frame <= DONNA_MIG2_END) {
    // Migration 2: Y:460→120, opacity 100%→65%
    const t = (frame - DONNA_MIG2_START) / (DONNA_MIG2_END - DONNA_MIG2_START);
    const ease = easeOutCubic(t);
    x = DONNA_HDR_X;
    y = 460 + (DONNA_HDR_Y - 460) * ease;
    fontSize = 80;
    opacity = 1 + (0.65 - 1) * ease;
    letterSpacing = "0.15em";
  } else if (frame < DONNA_CLOSE_START) {
    // Phase 4: Persistent top header
    x = DONNA_HDR_X;
    y = DONNA_HDR_Y;
    fontSize = 80;
    opacity = 0.65;
    letterSpacing = "0.15em";
  } else if (frame <= DONNA_CLOSE_END) {
    // Phase 5: Close animation Y:120→510, opacity 65%→100%, scale 1.0→1.25
    const t = (frame - DONNA_CLOSE_START) / (DONNA_CLOSE_END - DONNA_CLOSE_START);
    const ease = easeOutCubic(t);
    x = DONNA_HDR_X;
    y = DONNA_HDR_Y + (DONNA_CLOSE_Y - DONNA_HDR_Y) * ease;
    fontSize = 80;
    opacity = 0.65 + (1 - 0.65) * ease;
    scale = 1 + (1.25 - 1) * ease;
    letterSpacing = "0.15em";
  } else {
    // Phase 6: Hold at close position
    x = DONNA_HDR_X;
    y = DONNA_CLOSE_Y;
    fontSize = 80;
    opacity = 1;
    scale = 1.25;
    letterSpacing = "0.15em";
  }

  // Sub-line opacity
  const sublineOpacity =
    frame < SUBLINE_APPEAR
      ? 0
      : interpolate(
          frame,
          [SUBLINE_APPEAR, SUBLINE_FADE_IN_END],
          [0, 0.65],
          { ...CLAMP, easing: easeOutQuad }
        );

  return (
    <>
      {/* "Donna." */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
          opacity,
          fontFamily: DISPLAY_FONT,
          fontSize,
          fontWeight: 600,
          color: AMBER,
          letterSpacing,
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        Donna.
      </div>

      {/* Sub-line: "she already knows" */}
      {frame >= SUBLINE_APPEAR && (
        <div
          style={{
            position: "absolute",
            left: 960,
            top: 580,
            transform: "translate(-50%, -50%)",
            opacity: sublineOpacity,
            fontFamily: DISPLAY_FONT,
            fontSize: 20,
            fontStyle: "italic",
            fontWeight: 400,
            color: IVORY,
            letterSpacing: "0.05em",
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
        >
          she already knows
        </div>
      )}
    </>
  );
};
