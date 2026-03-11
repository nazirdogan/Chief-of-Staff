import React from "react";
import { loadFont } from "@remotion/google-fonts/Inter";
import "../load-fonts"; // loads Cormorant Garamond via FontFace API
import { BG } from "../constants";
import { ChaosLayer } from "../components/ChaosLayer";
import { Act2Targets } from "../components/Act2Targets";
import { Act3Layer } from "../components/Act3Layer";
import { FinalFrame } from "../components/FinalFrame";
import { SoundDesign } from "../components/SoundDesign";

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

      {/* Layer 3: Act 3 — amber light journey (frames 852–1003) */}
      <Act3Layer />

      {/* Layer 4: CTA sequence — DONNA wordmark + "Get Early Access" (frames 984–1188) */}
      <FinalFrame />

      {/* Audio */}
      <SoundDesign />
    </div>
  );
};
