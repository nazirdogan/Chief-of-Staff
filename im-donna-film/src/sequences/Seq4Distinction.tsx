import React from "react";
import { useCurrentFrame } from "remotion";
import { Word } from "../components/Word";
import { AccentLine } from "../components/AccentLine";
import { IVORY } from "../constants";

// Seq 4: frames 526–640  (0:21.9–0:26.7)
// "I don't organise your life." → full black gap → "I understand it."

export const Seq4Distinction: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 526 || frame > 640) return null;

  return (
    <>
      {/* "I don't organise your life." — fades at f575 */}
      <Word text="I"        x={760}  y={540} appearFrame={540} fadeOutFrame={575} fadeOutDur={7} fontSize={52} color={IVORY} />
      <Word text="don't"    x={835}  y={540} appearFrame={545} fadeOutFrame={575} fadeOutDur={7} fontSize={52} color={IVORY} />
      <Word text="organise" x={960}  y={540} appearFrame={550} fadeOutFrame={575} fadeOutDur={7} fontSize={52} color={IVORY} />
      <Word text="your"     x={1095} y={540} appearFrame={555} fadeOutFrame={575} fadeOutDur={7} fontSize={52} color={IVORY} />
      <Word text="life."    x={1178} y={540} appearFrame={560} fadeOutFrame={575} fadeOutDur={7} fontSize={52} color={IVORY} />

      {/* Full black gap: frames 582–590 */}

      {/* "I understand it." — 60px, appears f590 */}
      <Word text="I"          x={840}  y={540} appearFrame={590} fadeOutFrame={630} fadeOutDur={10} fontSize={60} color={IVORY} />
      <Word text="understand" x={940}  y={540} appearFrame={595} fadeOutFrame={630} fadeOutDur={10} fontSize={60} color={IVORY} />
      <Word text="it."        x={1100} y={540} appearFrame={602} fadeOutFrame={630} fadeOutDur={10} fontSize={60} color={IVORY} />

      <AccentLine
        x={820} y={584}
        appearFrame={602} maxWidth={380} growDur={12}
        fadeOutFrame={630} fadeOutDur={10} opacity={0.70}
      />
    </>
  );
};
