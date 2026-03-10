import React from "react";
import { loadFont } from "@remotion/google-fonts/Inter";
import { BG } from "../constants";
import { ChaosLayer } from "../components/ChaosLayer";
import { Act2Targets } from "../components/Act2Targets";
import { Act3Layer } from "../components/Act3Layer";
import { Act4Layer } from "../components/Act4Layer";
import { SoundDesign } from "../components/SoundDesign";

// Load Inter (UI font) — blocks rendering until ready
loadFont("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});

export const TheNoise: React.FC = () => {
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: BG,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Layer 1: Act 1 chaos (+ Act 2 fade/blur of non-targets) */}
      <ChaosLayer />

      {/* Layer 2: Act 2 target cards + labels + centre text */}
      <Act2Targets />

      {/* Layer 3: Act 3 — amber light journey + Donna wordmark */}
      <Act3Layer />

      {/* Layer 4: Act 4 — briefing lines + final wordmark */}
      <Act4Layer />

      {/* Audio */}
      <SoundDesign />
    </div>
  );
};
