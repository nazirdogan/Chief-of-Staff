import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { Word } from "../components/Word";
import { IVORY, UI_FONT, SEQ2_CLEAR } from "../constants";
import { CLAMP, easeOutQuad, easeInQuad } from "../utils";

// Seq 2: frames 140–390  (0:05.8–0:16.3)
// "Every morning, before you open your phone,
//  I've already read everything.
//  Every email. Every message. Every document.
//  Every commitment you made and forgot you made."

interface RiseCardProps {
  x: number; startY: number; endY: number;
  appearFrame: number; fadeDur: number;
  fadeOutFrame: number; fadeOutDur: number;
  maxOpacity: number; width: number; height: number;
  backgroundColor: string; borderRadius: number;
}
const RiseCard: React.FC<RiseCardProps> = ({
  x, startY, endY, appearFrame, fadeDur, fadeOutFrame, fadeOutDur,
  maxOpacity, width, height, backgroundColor, borderRadius,
}) => {
  const frame = useCurrentFrame();
  if (frame < appearFrame) return null;
  const currentY = interpolate(frame, [appearFrame, appearFrame + fadeDur], [startY, endY], { ...CLAMP, easing: easeOutQuad });
  let opacity = interpolate(frame, [appearFrame, appearFrame + fadeDur], [0, maxOpacity], { ...CLAMP, easing: easeOutQuad });
  if (frame >= fadeOutFrame) {
    opacity = interpolate(frame, [fadeOutFrame, fadeOutFrame + fadeOutDur], [maxOpacity, 0], { ...CLAMP, easing: easeInQuad });
  }
  return (
    <div style={{ position: "absolute", left: x - width / 2, top: currentY - height / 2, width, height, backgroundColor, borderRadius, opacity }} />
  );
};

interface SmallWordProps {
  text: string; x: number; y: number; appearFrame: number;
  fadeOutFrame?: number; fadeOutDur?: number; opacity?: number; fontSize?: number;
}
const SmallWord: React.FC<SmallWordProps> = ({
  text, x, y, appearFrame, fadeOutFrame, fadeOutDur = 7, opacity = 0.7, fontSize = 20,
}) => {
  const frame = useCurrentFrame();
  if (frame < appearFrame) return null;
  let currentOpacity = interpolate(frame, [appearFrame, appearFrame + 6], [0, opacity], { ...CLAMP, easing: easeOutQuad });
  if (fadeOutFrame !== undefined && frame >= fadeOutFrame) {
    currentOpacity = interpolate(frame, [fadeOutFrame, fadeOutFrame + fadeOutDur], [opacity, 0], { ...CLAMP, easing: easeInQuad });
  }
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", opacity: currentOpacity, fontFamily: UI_FONT, fontSize, color: IVORY, whiteSpace: "nowrap" }}>
      {text}
    </div>
  );
};

export const Seq2WhatSheReads: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 140 || frame > 390 + 14) return null;

  return (
    <>
      {/* "Every morning," */}
      <Word text="Every"    x={820} y={530} appearFrame={145} fadeOutFrame={168} fadeOutDur={10} fontSize={52} color={IVORY} />
      <Word text="morning," x={960} y={530} appearFrame={149} fadeOutFrame={168} fadeOutDur={10} fontSize={52} color={IVORY} />

      {/* "before you open your phone," — Inter 20px 70% */}
      <SmallWord text="before" x={790}  y={575} appearFrame={157} fadeOutFrame={168} fadeOutDur={10} />
      <SmallWord text="you"    x={878}  y={575} appearFrame={160} fadeOutFrame={168} fadeOutDur={10} />
      <SmallWord text="open"   x={950}  y={575} appearFrame={163} fadeOutFrame={168} fadeOutDur={10} />
      <SmallWord text="your"   x={1028} y={575} appearFrame={166} fadeOutFrame={168} fadeOutDur={10} />
      <SmallWord text="phone," x={1115} y={575} appearFrame={168} fadeOutFrame={172} fadeOutDur={10} />

      {/* "I've already read everything." */}
      <Word text="I've"        x={840}  y={530} appearFrame={172} fadeOutFrame={197} fadeOutDur={7} fontSize={52} color={IVORY} />
      <Word text="already"     x={935}  y={530} appearFrame={176} fadeOutFrame={197} fadeOutDur={7} fontSize={52} color={IVORY} />
      <Word text="read"        x={1060} y={530} appearFrame={181} fadeOutFrame={197} fadeOutDur={7} fontSize={52} color={IVORY} />
      <Word text="everything." x={1160} y={530} appearFrame={185} fadeOutFrame={197} fadeOutDur={7} fontSize={52} color={IVORY} />

      {/* "Every email." */}
      <Word text="Every"  x={870} y={530} appearFrame={197} fadeOutFrame={213} fadeOutDur={7} fontSize={52} color={IVORY} />
      <Word text="email." x={990} y={530} appearFrame={201} fadeOutFrame={213} fadeOutDur={7} fontSize={52} color={IVORY} />
      <RiseCard x={540} startY={620} endY={590} appearFrame={197} fadeDur={10} fadeOutFrame={213} fadeOutDur={7} maxOpacity={0.55} width={340} height={76} backgroundColor="#1A1A2E" borderRadius={8} />

      {/* "Every message." */}
      <Word text="Every"    x={870}  y={530} appearFrame={213} fadeOutFrame={231} fadeOutDur={7} fontSize={52} color={IVORY} />
      <Word text="message." x={1010} y={530} appearFrame={217} fadeOutFrame={231} fadeOutDur={7} fontSize={52} color={IVORY} />
      <RiseCard x={1380} startY={620} endY={585} appearFrame={213} fadeDur={10} fadeOutFrame={231} fadeOutDur={7} maxOpacity={0.50} width={280} height={64} backgroundColor="#1A1A2E" borderRadius={16} />

      {/* "Every document." */}
      <Word text="Every"     x={870}  y={530} appearFrame={231} fadeOutFrame={249} fadeOutDur={7} fontSize={52} color={IVORY} />
      <Word text="document." x={1010} y={530} appearFrame={235} fadeOutFrame={249} fadeOutDur={7} fontSize={52} color={IVORY} />
      <RiseCard x={420} startY={620} endY={585} appearFrame={231} fadeDur={10} fadeOutFrame={249} fadeOutDur={7} maxOpacity={0.50} width={320} height={80} backgroundColor="#1A1A2E" borderRadius={8} />

      {/* "Every commitment" — 58px */}
      <Word text="Every"      x={830} y={510} appearFrame={249} fadeOutFrame={SEQ2_CLEAR} fadeOutDur={10} fontSize={58} color={IVORY} />
      <Word text="commitment" x={990} y={510} appearFrame={254} fadeOutFrame={SEQ2_CLEAR} fadeOutDur={10} fontSize={58} color={IVORY} />

      {/* "you made and forgot you made." — Inter 18px 55% */}
      <SmallWord text="you made"   x={900}  y={572} appearFrame={260} fadeOutFrame={SEQ2_CLEAR} fadeOutDur={10} opacity={0.55} fontSize={18} />
      <SmallWord text="and forgot" x={1040} y={572} appearFrame={264} fadeOutFrame={SEQ2_CLEAR} fadeOutDur={10} opacity={0.55} fontSize={18} />
      <SmallWord text="you made."  x={1165} y={572} appearFrame={268} fadeOutFrame={SEQ2_CLEAR} fadeOutDur={10} opacity={0.55} fontSize={18} />
    </>
  );
};
