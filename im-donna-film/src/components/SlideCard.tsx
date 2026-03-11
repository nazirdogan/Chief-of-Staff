import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { CLAMP, easeOutCubic, easeInQuad } from "../utils";
import { IVORY, AMBER, UI_FONT } from "../constants";

type SlideDirection = "left" | "right" | "bottom";

interface SlideCardProps {
  x: number;
  y: number;
  width: number;
  height: number;
  appearFrame: number;
  slideDur?: number;
  slideOutFrame?: number;
  slideOutDur?: number;
  slideDirection?: SlideDirection;
  slideOutDirection?: SlideDirection;
  backgroundColor?: string;
  borderLeft?: string;
  borderRadius?: number;
  title: string;
  subtitle: string;
  subtitleColor?: string;
  initialCircle?: string;
}

export const SlideCard: React.FC<SlideCardProps> = ({
  x,
  y,
  width,
  height,
  appearFrame,
  slideDur = 19,
  slideOutFrame,
  slideOutDur = 12,
  slideDirection = "left",
  slideOutDirection = "left",
  backgroundColor = "#1A1A2E",
  borderLeft = `4px solid ${AMBER}`,
  borderRadius = 8,
  title,
  subtitle,
  subtitleColor = AMBER,
  initialCircle,
}) => {
  const frame = useCurrentFrame();

  if (frame < appearFrame) return null;

  // Determine start/end positions for slide in
  const getStartX = (dir: SlideDirection) => {
    if (dir === "left") return -width - 20;
    if (dir === "right") return 1920 + width + 20;
    return x;
  };
  const getStartY = (dir: SlideDirection) => {
    if (dir === "bottom") return 800;
    return y;
  };

  const startX = getStartX(slideDirection);
  const startY = getStartY(slideDirection);

  let currentX = interpolate(
    frame,
    [appearFrame, appearFrame + slideDur],
    [startX, x],
    { ...CLAMP, easing: easeOutCubic }
  );
  let currentY = interpolate(
    frame,
    [appearFrame, appearFrame + slideDur],
    [startY, y],
    { ...CLAMP, easing: easeOutCubic }
  );

  let opacity = interpolate(
    frame,
    [appearFrame, appearFrame + 10],
    [0, 1],
    { ...CLAMP, easing: easeOutCubic }
  );

  if (slideOutFrame !== undefined && frame >= slideOutFrame) {
    const outX = slideOutDirection === "left" ? -width - 200 : slideOutDirection === "right" ? 1920 + width + 200 : x;
    const outY = slideOutDirection === "bottom" ? 900 : y;
    currentX = interpolate(
      frame,
      [slideOutFrame, slideOutFrame + slideOutDur],
      [x, outX],
      { ...CLAMP, easing: easeInQuad }
    );
    currentY = interpolate(
      frame,
      [slideOutFrame, slideOutFrame + slideOutDur],
      [y, outY],
      { ...CLAMP, easing: easeInQuad }
    );
    opacity = interpolate(
      frame,
      [slideOutFrame, slideOutFrame + slideOutDur],
      [1, 0],
      CLAMP
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: currentX - width / 2,
        top: currentY - height / 2,
        width,
        height,
        backgroundColor,
        borderLeft,
        borderRadius,
        opacity,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
      }}
    >
      {initialCircle && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: AMBER,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: UI_FONT,
            fontSize: 16,
            fontWeight: 700,
            color: "#080810",
            flexShrink: 0,
          }}
        >
          {initialCircle}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontFamily: UI_FONT, fontSize: 15, fontWeight: 500, color: IVORY }}>
          {title}
        </div>
        <div style={{ fontFamily: UI_FONT, fontSize: 13, color: subtitleColor }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
};
