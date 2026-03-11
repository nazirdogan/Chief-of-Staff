import React from "react";
import { useCurrentFrame } from "remotion";
import { fadeIn, fadeOut } from "../utils";
import { AMBER, IVORY, DISPLAY_FONT } from "../constants";

interface BriefingLineProps {
  dotX: number;
  dotY: number;
  textX: number;
  textY: number;
  text: string;
  appearFrame: number;
  fadeOutFrame?: number;
  fadeOutDur?: number;
}

export const BriefingLine: React.FC<BriefingLineProps> = ({
  dotX,
  dotY,
  textX,
  textY,
  text,
  appearFrame,
  fadeOutFrame,
  fadeOutDur = 14,
}) => {
  const frame = useCurrentFrame();

  if (frame < appearFrame) return null;

  let opacity = fadeIn(frame, appearFrame, 8);
  if (fadeOutFrame !== undefined && frame >= fadeOutFrame) {
    opacity = fadeOut(frame, fadeOutFrame, fadeOutDur);
  }

  return (
    <>
      {/* Amber dot */}
      <div
        style={{
          position: "absolute",
          left: dotX,
          top: dotY,
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: AMBER,
          opacity,
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Text */}
      <div
        style={{
          position: "absolute",
          left: textX,
          top: textY,
          fontFamily: DISPLAY_FONT,
          fontSize: 22,
          color: IVORY,
          opacity,
          transform: "translateY(-50%)",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </>
  );
};
