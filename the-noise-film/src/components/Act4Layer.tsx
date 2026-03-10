import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import {
  ACT4_START, ANCHOR_LINE_APPEAR,
  BRIEFING_LINE_1, BRIEFING_LINE_2, BRIEFING_LINE_3, BRIEFING_HOLD_END,
  FINAL_LINE_APPEAR, BRIEFING_FADE_START, HOLD_BLACK,
  FINAL_WORDMARK, FILM_END,
  TEXT_COLOR, DISPLAY_FONT, ACCENT,
} from "../constants";
import { easeOutQuad, easeInQuad, CLAMP } from "../utils";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fadeIn(frame: number, start: number, dur = 12) {
  return interpolate(frame, [start, start + dur], [0, 1], {
    ...CLAMP, easing: easeOutQuad,
  });
}

function fadeOut(frame: number, start: number, dur = 24) {
  return interpolate(frame, [start, start + dur], [1, 0], {
    ...CLAMP, easing: easeInQuad,
  });
}

// ─── ANCHOR LINE ──────────────────────────────────────────────────────────────
const AnchorLine: React.FC<{ globalFade: number }> = ({ globalFade }) => {
  const frame = useCurrentFrame();
  if (frame < ANCHOR_LINE_APPEAR) return null;

  // Grows downward from Y:400 to Y:680 (280px tall)
  const scaleY = interpolate(frame, [ANCHOR_LINE_APPEAR, ANCHOR_LINE_APPEAR + 12], [0, 1], {
    ...CLAMP, easing: easeOutQuad,
  });

  // Fade out when final line appears
  const lineOp = interpolate(frame, [FINAL_LINE_APPEAR, FINAL_LINE_APPEAR + 19], [0.25, 0], {
    ...CLAMP, easing: easeOutQuad,
  });

  const op = (frame < FINAL_LINE_APPEAR ? 0.25 : lineOp) * globalFade;

  return (
    <div
      style={{
        position: "absolute",
        left: 960,
        top: 400,
        width: 1,
        height: 280,
        background: TEXT_COLOR,
        opacity: op,
        transformOrigin: "top center",
        transform: `scaleY(${scaleY})`,
      }}
    />
  );
};

// ─── BRIEFING LINE ────────────────────────────────────────────────────────────
const BriefingLine: React.FC<{
  text: string;
  y: number;
  appearFrame: number;
  globalFade: number;
}> = ({ text, y, appearFrame, globalFade }) => {
  const frame = useCurrentFrame();
  if (frame < appearFrame) return null;

  const elapsed = frame - appearFrame;

  // Opacity + 15px slide-in from right
  const op = fadeIn(frame, appearFrame);
  const tx = interpolate(elapsed, [0, 12], [15, 0], {
    ...CLAMP, easing: easeOutQuad,
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 1000,
        top: y,
        transform: `translateX(${tx}px)`,
        opacity: op * globalFade,
        display: "flex",
        alignItems: "flex-start",
        gap: 0,
        maxWidth: 760,
      }}
    >
      {/* Amber bullet dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: ACCENT,
          flexShrink: 0,
          marginTop: 7,
          marginRight: 12,
          marginLeft: -20,
        }}
      />
      <div
        style={{
          fontFamily: DISPLAY_FONT,
          fontSize: 22,
          fontWeight: 400,
          color: TEXT_COLOR,
          lineHeight: 1.4,
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ─── FINAL LINE ───────────────────────────────────────────────────────────────
const FinalLine: React.FC<{ globalFade: number }> = ({ globalFade }) => {
  const frame = useCurrentFrame();
  if (frame < FINAL_LINE_APPEAR) return null;

  const op = interpolate(frame, [FINAL_LINE_APPEAR, FINAL_LINE_APPEAR + 19], [0, 0.7], {
    ...CLAMP, easing: easeOutQuad,
  });

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 660,
        transform: "translateX(-50%)",
        opacity: op * globalFade,
        fontFamily: DISPLAY_FONT,
        fontStyle: "italic",
        fontSize: 20,
        color: TEXT_COLOR,
        whiteSpace: "nowrap",
      }}
    >
      Every morning, before you ask.
    </div>
  );
};

// ─── FINAL WORDMARK ───────────────────────────────────────────────────────────
const FinalWordmark: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < FINAL_WORDMARK) return null;

  const op = interpolate(frame, [FINAL_WORDMARK, FINAL_WORDMARK + 10], [0, 1], {
    ...CLAMP, easing: easeOutQuad,
  });
  const subOp = op * 0.65;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 520,
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
      }}
    >
      <Img
        src={staticFile("donna-wordmark.svg")}
        style={{ width: 390, height: "auto", opacity: op }}
      />
      <div
        style={{
          marginTop: 12,
          fontFamily: DISPLAY_FONT,
          fontStyle: "italic",
          fontSize: 18,
          color: TEXT_COLOR,
          letterSpacing: "0.05em",
          opacity: subOp,
          whiteSpace: "nowrap",
        }}
      >
        the intelligence that pays attention
      </div>
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export const Act4Layer: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < ACT4_START) return null;

  // Global fade for briefing content (0:57.50 → 0:58.50)
  const briefingFade =
    frame < BRIEFING_FADE_START
      ? 1
      : fadeOut(frame, BRIEFING_FADE_START, 24);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <AnchorLine globalFade={briefingFade} />

      <BriefingLine
        text="Follow up with Marcus — you promised two weeks ago."
        y={430}
        appearFrame={BRIEFING_LINE_1}
        globalFade={briefingFade}
      />
      <BriefingLine
        text="Sarah hasn't heard from you in 47 days."
        y={510}
        appearFrame={BRIEFING_LINE_2}
        globalFade={briefingFade}
      />
      <BriefingLine
        text="Ahmed is still waiting. You've snoozed this three times."
        y={590}
        appearFrame={BRIEFING_LINE_3}
        globalFade={briefingFade}
      />

      <FinalLine globalFade={briefingFade} />

      {/* Final wordmark — appears after all briefing content fades */}
      {frame >= FINAL_WORDMARK && <FinalWordmark />}
    </div>
  );
};
