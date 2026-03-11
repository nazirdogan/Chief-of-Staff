import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { CLAMP, easeOutQuad, easeInQuad } from "../utils";
import { DISPLAY_FONT, IVORY } from "../constants";

interface WordProps {
  text: string;
  x: number;
  y: number;
  appearFrame: number;
  fadeOutFrame?: number;
  fadeOutDur?: number;
  fontSize?: number;
  color?: string;
  fontStyle?: "normal" | "italic";
  fontWeight?: number | string;
  letterSpacing?: string;
  settleDur?: number;
  font?: string;
}

export const Word: React.FC<WordProps> = ({
  text,
  x,
  y,
  appearFrame,
  fadeOutFrame,
  fadeOutDur = 10,
  fontSize = 52,
  color = IVORY,
  fontStyle = "normal",
  fontWeight = 400,
  letterSpacing = "normal",
  settleDur = 6,
  font = DISPLAY_FONT,
}) => {
  const frame = useCurrentFrame();

  if (frame < appearFrame) return null;

  // Settle: Y drops from +8 to 0 over settleDur frames
  const settleY = interpolate(
    frame,
    [appearFrame, appearFrame + settleDur],
    [8, 0],
    { ...CLAMP, easing: easeOutQuad }
  );

  // Fade in
  let opacity = interpolate(
    frame,
    [appearFrame, appearFrame + settleDur],
    [0, 1],
    { ...CLAMP, easing: easeOutQuad }
  );

  // Fade out
  if (fadeOutFrame !== undefined && frame >= fadeOutFrame) {
    opacity = interpolate(
      frame,
      [fadeOutFrame, fadeOutFrame + fadeOutDur],
      [1, 0],
      { ...CLAMP, easing: easeInQuad }
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + settleY,
        transform: "translate(-50%, -50%)",
        opacity,
        fontFamily: font,
        fontSize,
        fontStyle,
        fontWeight,
        color,
        letterSpacing,
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      {text}
    </div>
  );
};
