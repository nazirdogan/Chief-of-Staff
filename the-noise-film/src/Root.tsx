import React from "react";
import { Composition } from "remotion";
import { TheNoise } from "./compositions/TheNoise";
import { DURATION_FRAMES, FPS, W, H } from "./constants";

export const Root: React.FC = () => {
  return (
    <Composition
      id="TheNoise"
      component={TheNoise}
      durationInFrames={DURATION_FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
  );
};
