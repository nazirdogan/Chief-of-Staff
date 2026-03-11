import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { Word } from "../components/Word";
import { AccentLine } from "../components/AccentLine";
import { SlideCard } from "../components/SlideCard";
import { IVORY, AMBER, UI_FONT } from "../constants";
import { CLAMP, easeOutQuad, easeInQuad, easeInOutCubic } from "../utils";

// Seq 3: frames 386–580  (0:16.1–0:24.2)
// Beat 1: "I know who you promised something to." + Marcus card (386–430)
// Beat 2: "I know who's been waiting." + Thompson card (444–484)
// Beat 3: "And I know who you haven't spoken to in 47 days." + Sarah card (496–570)

interface SmallWordProps {
  text: string; x: number; y: number; appearFrame: number;
  fadeOutFrame?: number; fadeOutDur?: number;
}
const SmallWord: React.FC<SmallWordProps> = ({ text, x, y, appearFrame, fadeOutFrame, fadeOutDur = 7 }) => {
  const frame = useCurrentFrame();
  if (frame < appearFrame) return null;
  let opacity = interpolate(frame, [appearFrame, appearFrame + 5], [0, 0.70], { ...CLAMP, easing: easeOutQuad });
  if (fadeOutFrame !== undefined && frame >= fadeOutFrame) {
    opacity = interpolate(frame, [fadeOutFrame, fadeOutFrame + fadeOutDur], [0.70, 0], { ...CLAMP, easing: easeInQuad });
  }
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", opacity, fontFamily: UI_FONT, fontSize: 20, color: IVORY, whiteSpace: "nowrap" }}>
      {text}
    </div>
  );
};

// "47" pulse
const use47Scale = (frame: number, pulseFrame: number) => {
  if (frame < pulseFrame || frame > pulseFrame + 10) return 1;
  const t = (frame - pulseFrame) / 10;
  return t < 0.5
    ? 1 + 0.15 * easeInOutCubic(t * 2)
    : 1.15 - 0.15 * easeInOutCubic((t - 0.5) * 2);
};

export const Seq3WhatSheKnows: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 386 || frame > 580 + 14) return null;

  const pulseScale = use47Scale(frame, 540);

  return (
    <>
      {/* ── Beat 1: "I know who you promised something to." + Marcus ── */}
      {frame >= 386 && frame < 444 && (
        <>
          <Word text="I"    x={900} y={420} appearFrame={386} fadeOutFrame={430} fadeOutDur={10} fontSize={52} color={IVORY} />
          <Word text="know" x={980} y={420} appearFrame={390} fadeOutFrame={430} fadeOutDur={10} fontSize={52} color={IVORY} />
          <AccentLine x={870} y={454} appearFrame={395} maxWidth={180} growDur={7} fadeOutFrame={430} fadeOutDur={10} opacity={0.7} />
          <SmallWord text="who you"    x={910}  y={468} appearFrame={400} fadeOutFrame={430} fadeOutDur={8} />
          <SmallWord text="promised"   x={1010} y={468} appearFrame={404} fadeOutFrame={430} fadeOutDur={8} />
          <SmallWord text="something"  x={1115} y={468} appearFrame={408} fadeOutFrame={430} fadeOutDur={8} />
          <SmallWord text="to."        x={1195} y={468} appearFrame={412} fadeOutFrame={430} fadeOutDur={8} />
        </>
      )}
      <SlideCard
        x={960} y={510} width={360} height={72}
        appearFrame={386} slideDur={19} slideOutFrame={430} slideOutDur={12}
        slideDirection="left" slideOutDirection="left"
        backgroundColor="rgba(26,26,46,0.90)" borderLeft={`4px solid ${AMBER}`} borderRadius={8}
        title="Follow up — Marcus" subtitle="Promised 2 weeks ago" subtitleColor={AMBER}
      />

      {/* ── Beat 2: "I know who's been waiting." + Thompson ── */}
      {frame >= 444 && frame < 496 && (
        <>
          <Word text="I"    x={900} y={420} appearFrame={444} fadeOutFrame={484} fadeOutDur={10} fontSize={52} color={IVORY} />
          <Word text="know" x={980} y={420} appearFrame={448} fadeOutFrame={484} fadeOutDur={10} fontSize={52} color={IVORY} />
          <AccentLine x={870} y={454} appearFrame={452} maxWidth={180} growDur={7} fadeOutFrame={484} fadeOutDur={10} opacity={0.7} />
          <SmallWord text="who's"   x={893}  y={468} appearFrame={458} fadeOutFrame={484} fadeOutDur={8} />
          <SmallWord text="been"    x={970}  y={468} appearFrame={462} fadeOutFrame={484} fadeOutDur={8} />
          <SmallWord text="waiting." x={1058} y={468} appearFrame={466} fadeOutFrame={484} fadeOutDur={8} />
        </>
      )}
      <SlideCard
        x={960} y={510} width={360} height={72}
        appearFrame={444} slideDur={17} slideOutFrame={484} slideOutDur={12}
        slideDirection="right" slideOutDirection="right"
        backgroundColor="rgba(26,26,46,0.90)" borderLeft={`4px solid ${AMBER}`} borderRadius={8}
        title="J. Thompson" subtitle="Last message from them: 5 weeks ago" subtitleColor={AMBER}
      />

      {/* ── Beat 3: "And I know who you haven't spoken to in 47 days." + Sarah ── */}
      {frame >= 496 && (
        <>
          <Word text="And"  x={820} y={395} appearFrame={496} fadeOutFrame={570} fadeOutDur={12} fontSize={52} color={IVORY} />
          <Word text="I"    x={905} y={395} appearFrame={500} fadeOutFrame={570} fadeOutDur={12} fontSize={52} color={IVORY} />
          <Word text="know" x={970} y={395} appearFrame={504} fadeOutFrame={570} fadeOutDur={12} fontSize={52} color={IVORY} />
          <AccentLine x={810} y={428} appearFrame={510} maxWidth={220} growDur={7} fadeOutFrame={570} fadeOutDur={12} opacity={0.7} />
          <SmallWord text="who you"   x={892}  y={442} appearFrame={515} fadeOutFrame={570} fadeOutDur={10} />
          <SmallWord text="haven't"   x={985}  y={442} appearFrame={519} fadeOutFrame={570} fadeOutDur={10} />
          <SmallWord text="spoken to" x={1090} y={442} appearFrame={523} fadeOutFrame={570} fadeOutDur={10} />
          <SmallWord text="in"        x={890}  y={462} appearFrame={527} fadeOutFrame={570} fadeOutDur={10} />

          {/* "47" — pulses when it lands */}
          <div style={{
            position: "absolute",
            left: 938,
            top: 462,
            transform: `translate(-50%, -50%) scale(${pulseScale})`,
            transformOrigin: "center center",
            opacity: frame < 532 ? 0 : (frame >= 570 ? interpolate(frame, [570, 580], [0.70, 0], CLAMP) : interpolate(frame, [532, 537], [0, 0.70], CLAMP)),
            fontFamily: UI_FONT,
            fontSize: 20,
            color: AMBER,
            whiteSpace: "nowrap",
          }}>
            47
          </div>

          <SmallWord text="days."     x={987}  y={462} appearFrame={536} fadeOutFrame={570} fadeOutDur={10} />
        </>
      )}
      <SlideCard
        x={960} y={510} width={320} height={70}
        appearFrame={496} slideDur={19} slideOutFrame={570} slideOutDur={14}
        slideDirection="bottom" slideOutDirection="bottom"
        backgroundColor="rgba(26,42,26,0.85)" borderLeft="4px solid #4A9A6A" borderRadius={8}
        title="Sarah K." subtitle="Last contact: 47 days ago" subtitleColor={AMBER}
        initialCircle="S"
      />
    </>
  );
};
