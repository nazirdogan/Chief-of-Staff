import React from "react";
import { AbsoluteFill } from "remotion";
import { BG, W, H } from "../constants";
import { DonnaHeader } from "../components/DonnaHeader";
import { SoundLayer } from "../components/SoundLayer";
import { Seq1Introduction } from "../sequences/Seq1Introduction";
import { Seq2WhatSheReads } from "../sequences/Seq2WhatSheReads";
import { Seq3WhatSheKnows } from "../sequences/Seq3WhatSheKnows";
import { Seq4Distinction } from "../sequences/Seq4Distinction";
import { Seq5ThreeThings } from "../sequences/Seq5ThreeThings";
import { Seq6Release } from "../sequences/Seq6Release";
import { Seq7FinalCard } from "../sequences/Seq7FinalCard";

export const ImDonna: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        width: W,
        height: H,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Sound layer — audio only */}
      <SoundLayer />

      {/* Persistent Donna header across all phases */}
      <DonnaHeader />

      {/* Sequence layers */}
      <Seq1Introduction />
      <Seq2WhatSheReads />
      <Seq3WhatSheKnows />
      <Seq4Distinction />
      <Seq5ThreeThings />
      <Seq6Release />
      <Seq7FinalCard />
    </AbsoluteFill>
  );
};
