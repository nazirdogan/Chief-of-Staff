import React from "react";
import { useCurrentFrame } from "remotion";
import { Word } from "../components/Word";
import { AccentLine } from "../components/AccentLine";
import { FloatingCard } from "../components/FloatingCard";
import { IVORY, SEQ1_END, MNIS_FADE } from "../constants";

// Seq 1: frames 0–140  (0:00–0:05.8)
// "My name is Donna." → beat 1.2s → "I work while you sleep."
// "Donna." is handled by DonnaHeader

export const Seq1Introduction: React.FC = () => {
  const frame = useCurrentFrame();

  if (frame > SEQ1_END + 14) return null;

  return (
    <>
      {/* "My" */}
      <Word
        text="My"
        x={760}
        y={520}
        appearFrame={24}
        fadeOutFrame={MNIS_FADE}
        fadeOutDur={10}
        fontSize={52}
        color={IVORY}
      />

      {/* "name" */}
      <Word
        text="name"
        x={870}
        y={520}
        appearFrame={29}
        fadeOutFrame={MNIS_FADE}
        fadeOutDur={10}
        fontSize={52}
        color={IVORY}
      />

      {/* "is" */}
      <Word
        text="is"
        x={990}
        y={520}
        appearFrame={35}
        fadeOutFrame={MNIS_FADE}
        fadeOutDur={10}
        fontSize={52}
        color={IVORY}
      />

      {/* Accent line under "My name is Donna." — appears at frame 48 */}
      <AccentLine
        x={760}
        y={555}
        appearFrame={48}
        maxWidth={360}
        growDur={10}
        fadeOutFrame={MNIS_FADE}
        fadeOutDur={10}
        opacity={0.55}
      />

      {/* "I work while you sleep." — after 1.2s beat from "My name is Donna." */}
      <Word text="I"      x={820}  y={560} appearFrame={84}  fadeOutFrame={SEQ1_END} fadeOutDur={14} fontSize={52} color={IVORY} />
      <Word text="work"   x={895}  y={560} appearFrame={88}  fadeOutFrame={SEQ1_END} fadeOutDur={14} fontSize={52} color={IVORY} />
      <Word text="while"  x={990}  y={560} appearFrame={92}  fadeOutFrame={SEQ1_END} fadeOutDur={14} fontSize={52} color={IVORY} />
      <Word text="you"    x={1090} y={560} appearFrame={96}  fadeOutFrame={SEQ1_END} fadeOutDur={14} fontSize={52} color={IVORY} />
      <Word text="sleep." x={1180} y={560} appearFrame={100} fadeOutFrame={SEQ1_END} fadeOutDur={14} fontSize={52} color={IVORY} />

      {/* Background fragment cards */}
      <FloatingCard
        x={300} y={400} width={340} height={76}
        appearFrame={106} fadeDur={24} fadeOutFrame={SEQ1_END} fadeOutDur={14}
        maxOpacity={0.35} backgroundColor="rgba(26,26,46,0.85)"
        border="1px solid #3A3A5C" borderRadius={12}
      />
      <FloatingCard
        x={1600} y={600} width={300} height={58}
        appearFrame={115} fadeDur={24} fadeOutFrame={SEQ1_END} fadeOutDur={14}
        maxOpacity={0.30} backgroundColor="rgba(30,45,74,0.80)"
        borderLeft="4px solid #C4914A" borderRadius={8}
      />
      <FloatingCard
        x={220} y={640} width={220} height={44}
        appearFrame={124} fadeDur={24} fadeOutFrame={SEQ1_END} fadeOutDur={14}
        maxOpacity={0.25} backgroundColor="rgba(46,26,58,0.85)"
        border="1px solid #7A4A9A" borderRadius={22}
      />
    </>
  );
};
