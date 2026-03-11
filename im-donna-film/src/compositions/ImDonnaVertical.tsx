import React from "react";
import { AbsoluteFill } from "remotion";
import { BG, W, H, V_H } from "../constants";
import { ImDonna } from "./ImDonna";

// 9:16 vertical cut (1080×1920) — scales the 16:9 master and centres it vertically.
// Scale: 1080/1920 = 0.5625
// Scaled height: 1080 × 0.5625 = 607.5px
// Top offset: (1920 − 607.5) / 2 = 656.25px

const SCALE = 1080 / W; // 0.5625
const SCALED_H = H * SCALE; // 607.5
const TOP_OFFSET = (V_H - SCALED_H) / 2; // 656.25

export const ImDonnaVertical: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <div
        style={{
          position: "absolute",
          top: TOP_OFFSET,
          left: 0,
          width: W,
          height: H,
          transformOrigin: "0 0",
          transform: `scale(${SCALE})`,
        }}
      >
        <ImDonna />
      </div>
    </AbsoluteFill>
  );
};
