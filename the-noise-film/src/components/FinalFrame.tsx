import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/PlayfairDisplay";
import {
  FINAL_FRAME_START,
  FINAL_DONNA_APPEAR,
  FINAL_HEADING_APPEAR,
  FINAL_CTA_APPEAR,
  FINAL_URL_APPEAR,
  ACCENT,
  TEXT_COLOR,
  DISPLAY_FONT,
  UI_FONT,
} from "../constants";
import { easeOutQuad, CLAMP } from "../utils";

// Load Playfair Display for the wordmark
loadFont("normal", { weights: ["700"], subsets: ["latin"] });

// ─── DONNA WORDMARK ───────────────────────────────────────────────────────────
// Inline SVG — extracts text from donna-wordmark.svg and centres the text
// itself at X:960 using text-anchor="middle". This guarantees pixel-perfect
// centering regardless of font metrics, unlike placing the SVG file as an <Img>.
// Baseline lands at Y:380. Subline "she already knows" sits at Y:442 (62px below).
const DonnaWordmark: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < FINAL_DONNA_APPEAR) return null;

  const op = interpolate(frame, [FINAL_DONNA_APPEAR, FINAL_DONNA_APPEAR + 14], [0, 1], {
    ...CLAMP, easing: easeOutQuad,
  });
  const scale = interpolate(op, [0, 1], [0.95, 1.0], CLAMP);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        // Baseline of 72px text with y=72 in SVG: container top = 380 - 72 = 308
        top: 308,
        width: 1920,
        opacity: op,
        transform: `scale(${scale})`,
        transformOrigin: "960px 72px", // scale from the text baseline centre
      }}
    >
      <svg
        viewBox="0 0 1920 90"
        width={1920}
        height={90}
        xmlns="http://www.w3.org/2000/svg"
        overflow="visible"
      >
        <text
          x={960}
          y={72}
          textAnchor="middle"
          fontFamily="'Playfair Display', serif"
          fontSize={72}
          fontWeight={700}
          letterSpacing={-2}
          fill="#FAF9F6"
        >
          Donna
          <tspan fill="#E8845C" letterSpacing={0}>.</tspan>
        </text>
      </svg>
    </div>
  );
};

// ─── SUBLINE ─────────────────────────────────────────────────────────────────
// "she already knows" — italic, 32px, 80% opacity
// Appears at Y:442 (62px below wordmark baseline)
// Animation: Opacity 0→80%, Y settle 450→442, 0.60s (14 frames)
const Subline: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < FINAL_HEADING_APPEAR) return null;

  const progress = interpolate(
    frame,
    [FINAL_HEADING_APPEAR, FINAL_HEADING_APPEAR + 14],
    [0, 1],
    { ...CLAMP, easing: easeOutQuad }
  );

  const op = progress * 0.8;
  const ty = interpolate(progress, [0, 1], [8, 0], CLAMP); // 8px settle upward

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 442,
        transform: `translateX(-50%) translateY(${ty}px)`,
        opacity: op,
        fontFamily: DISPLAY_FONT,
        fontStyle: "italic",
        fontSize: 32,
        fontWeight: 400,
        color: TEXT_COLOR,
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      she already knows
    </div>
  );
};

// ─── GET EARLY ACCESS BUTTON ──────────────────────────────────────────────────
// 280×58px, #C4914A fill, corner radius 8px
// "Get Early Access" — Inter Medium 18px, #080810 (near black)
// Appears at Y:540 (centred)
// Animation: Opacity 0→100%, Scale 0.94→1.00, 0.50s (12 frames)
const CTAButton: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < FINAL_CTA_APPEAR) return null;

  const progress = interpolate(
    frame,
    [FINAL_CTA_APPEAR, FINAL_CTA_APPEAR + 12],
    [0, 1],
    { ...CLAMP, easing: easeOutQuad }
  );

  const op = progress;
  const scale = interpolate(progress, [0, 1], [0.94, 1.0], CLAMP);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 540,
        transform: `translateX(-50%) translateY(-50%) scale(${scale})`,
        transformOrigin: "center center",
        opacity: op,
        width: 280,
        height: 58,
        background: ACCENT,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
      }}
    >
      <span
        style={{
          fontFamily: UI_FONT,
          fontWeight: 500,
          fontSize: 18,
          color: "#080810",
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
        }}
      >
        Get Early Access
      </span>
    </div>
  );
};

// ─── URL LINE ─────────────────────────────────────────────────────────────────
// "imdonna.app" — DISPLAY_FONT 32px, 65% opacity
// Appears at Y:620 (51px below button bottom edge)
// Animation: Opacity 0→65%, Y settle 628→620, 0.60s (14 frames)
const UrlLine: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < FINAL_URL_APPEAR) return null;

  const progress = interpolate(
    frame,
    [FINAL_URL_APPEAR, FINAL_URL_APPEAR + 14],
    [0, 1],
    { ...CLAMP, easing: easeOutQuad }
  );

  const op = progress * 0.65;
  const ty = interpolate(progress, [0, 1], [8, 0], CLAMP);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 620,
        transform: `translateX(-50%) translateY(${ty}px)`,
        opacity: op,
        fontFamily: DISPLAY_FONT,
        fontSize: 32,
        fontWeight: 400,
        color: TEXT_COLOR,
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      imdonna.app
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
// CTA sequence: frames 984–1188
// Layout (all centred at X:960):
//   Y:380  — "DONNA" wordmark
//   Y:442  — "she already knows"
//   Y:540  — [Get Early Access] button (centred)
//   Y:620  — "imdonna.app"
// Film ends at frame 1188 holding on this frame — no fade to black.
export const FinalFrame: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < FINAL_FRAME_START) return null;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <DonnaWordmark />
      <Subline />
      <CTAButton />
      <UrlLine />
    </div>
  );
};
