import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { CLAMP, easeOutQuad, easeInQuad } from "../utils";

interface FloatingCardProps {
  x: number;
  y: number;
  width: number;
  height: number;
  appearFrame: number;
  fadeDur?: number;
  fadeOutFrame?: number;
  fadeOutDur?: number;
  maxOpacity?: number;
  backgroundColor?: string;
  border?: string;
  borderRadius?: number;
  borderLeft?: string;
  children?: React.ReactNode;
}

export const FloatingCard: React.FC<FloatingCardProps> = ({
  x,
  y,
  width,
  height,
  appearFrame,
  fadeDur = 24,
  fadeOutFrame,
  fadeOutDur = 14,
  maxOpacity = 0.35,
  backgroundColor = "#1A1A2E",
  border,
  borderRadius = 12,
  borderLeft,
  children,
}) => {
  const frame = useCurrentFrame();

  if (frame < appearFrame) return null;

  let opacity = interpolate(
    frame,
    [appearFrame, appearFrame + fadeDur],
    [0, maxOpacity],
    { ...CLAMP, easing: easeOutQuad }
  );

  if (fadeOutFrame !== undefined && frame >= fadeOutFrame) {
    opacity = interpolate(
      frame,
      [fadeOutFrame, fadeOutFrame + fadeOutDur],
      [maxOpacity, 0],
      { ...CLAMP, easing: easeInQuad }
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: x - width / 2,
        top: y - height / 2,
        width,
        height,
        backgroundColor,
        border,
        borderLeft,
        borderRadius,
        opacity,
      }}
    >
      {children}
    </div>
  );
};
