import React from "react";
import { Composition } from "remotion";
import { ImDonna } from "./compositions/ImDonna";
import { ImDonnaVertical } from "./compositions/ImDonnaVertical";
import { FPS, DURATION_FRAMES, W, H, V_W, V_H } from "./constants";
import "./load-fonts";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 16:9 master — 1920×1080 */}
      <Composition
        id="ImDonna"
        component={ImDonna}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={W}
        height={H}
      />

      {/* 9:16 vertical — 1080×1920 */}
      <Composition
        id="ImDonnaVertical"
        component={ImDonnaVertical}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={V_W}
        height={V_H}
      />
    </>
  );
};
