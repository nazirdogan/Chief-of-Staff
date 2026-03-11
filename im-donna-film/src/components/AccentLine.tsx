import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { CLAMP, easeOutCubic, easeInQuad } from "../utils";
import { AMBER } from "../constants";

interface AccentLineProps {
  x: number;
  y: number;
  appearFrame: number;
  maxWidth: number;
  growDur?: number;
  fadeOutFrame?: number;
  fadeOutDur?: number;
  color?: string;
  opacity?: number;
  height?: number;
}

export const AccentLine: React.FC<AccentLineProps> = ({
  x,
  y,
  appearFrame,
  maxWidth,
  growDur = 10,
  fadeOutFrame,
  fadeOutDur = 10,
  color = AMBER,
  opacity = 0.55,
  height = 1.5,
}) => {
  const frame = useCurrentFrame();

  if (frame < appearFrame) return null;

  const width = interpolate(
    frame,
    [appearFrame, appearFrame + growDur],
    [0, maxWidth],
    { ...CLAMP, easing: easeOutCubic }
  );

  let currentOpacity = opacity;
  if (fadeOutFrame !== undefined && frame >= fadeOutFrame) {
    currentOpacity = interpolate(
      frame,
      [fadeOutFrame, fadeOutFrame + fadeOutDur],
      [opacity, 0],
      { ...CLAMP, easing: easeInQuad }
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        backgroundColor: color,
        opacity: currentOpacity,
      }}
    />
  );
};
