import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { Word } from "../components/Word";
import { BriefingLine } from "../components/BriefingLine";
import { IVORY, UI_FONT } from "../constants";
import { CLAMP, easeOutCubic, easeInQuad } from "../utils";

// Seq 5: frames 631–790  (0:26.3–0:32.9)
// "Every morning I tell you three things."
// "Not the loudest things." → "The right things."
// Three briefing lines

interface MovingWordProps {
  text: string; startX: number; startY: number; endX: number; endY: number;
  moveStart: number; moveDur: number; appearFrame: number;
  fadeOutFrame?: number; fadeOutDur?: number; fontSize?: number;
}
const MovingWord: React.FC<MovingWordProps> = ({
  text, startX, startY, endX, endY, moveStart, moveDur,
  appearFrame, fadeOutFrame, fadeOutDur = 10, fontSize = 48,
}) => {
  const frame = useCurrentFrame();
  if (frame < appearFrame) return null;
  const DISPLAY_FONT = '"Cormorant Garamond", Georgia, serif';
  const x = interpolate(frame, [moveStart, moveStart + moveDur], [startX, endX], { ...CLAMP, easing: easeOutCubic });
  const y = interpolate(frame, [moveStart, moveStart + moveDur], [startY, endY], { ...CLAMP, easing: easeOutCubic });
  let opacity = 1;
  if (fadeOutFrame !== undefined && frame >= fadeOutFrame) {
    opacity = interpolate(frame, [fadeOutFrame, fadeOutFrame + fadeOutDur], [1, 0], { ...CLAMP, easing: easeInQuad });
  }
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", opacity, fontFamily: DISPLAY_FONT, fontSize, color: IVORY, whiteSpace: "nowrap" }}>
      {text}
    </div>
  );
};

interface SmallWordProps { text: string; x: number; y: number; appearFrame: number; fadeOutFrame?: number; fadeOutDur?: number; }
const SmallWord: React.FC<SmallWordProps> = ({ text, x, y, appearFrame, fadeOutFrame, fadeOutDur = 7 }) => {
  const frame = useCurrentFrame();
  if (frame < appearFrame) return null;
  let opacity = interpolate(frame, [appearFrame, appearFrame + 6], [0, 0.6], CLAMP);
  if (fadeOutFrame !== undefined && frame >= fadeOutFrame) {
    opacity = interpolate(frame, [fadeOutFrame, fadeOutFrame + fadeOutDur], [0.6, 0], CLAMP);
  }
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", opacity, fontFamily: UI_FONT, fontSize: 20, color: IVORY, whiteSpace: "nowrap" }}>
      {text}
    </div>
  );
};

export const Seq5ThreeThings: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 631 || frame > 790 + 14) return null;

  return (
    <>
      {/* "Every morning I tell you" — fades at f660 */}
      <Word text="Every"   x={790}  y={480} appearFrame={631} fadeOutFrame={660} fadeOutDur={10} fontSize={48} color={IVORY} />
      <Word text="morning" x={920}  y={480} appearFrame={635} fadeOutFrame={660} fadeOutDur={10} fontSize={48} color={IVORY} />
      <Word text="I"       x={1020} y={480} appearFrame={639} fadeOutFrame={660} fadeOutDur={10} fontSize={48} color={IVORY} />
      <Word text="tell"    x={1088} y={480} appearFrame={643} fadeOutFrame={660} fadeOutDur={10} fontSize={48} color={IVORY} />
      <Word text="you"     x={1158} y={480} appearFrame={647} fadeOutFrame={660} fadeOutDur={10} fontSize={48} color={IVORY} />

      {/* "three things." — appears then repositions to center */}
      <MovingWord
        text="three things."
        startX={1278} startY={480} endX={960} endY={400}
        moveStart={660} moveDur={14}
        appearFrame={651} fadeOutFrame={770} fadeOutDur={14}
        fontSize={48}
      />

      {/* "Not the loudest things." — Inter 20px 60% */}
      <SmallWord text="Not"     x={830}  y={520} appearFrame={676} fadeOutFrame={700} fadeOutDur={7} />
      <SmallWord text="the"     x={908}  y={520} appearFrame={679} fadeOutFrame={700} fadeOutDur={7} />
      <SmallWord text="loudest" x={988}  y={520} appearFrame={682} fadeOutFrame={700} fadeOutDur={7} />
      <SmallWord text="things." x={1090} y={520} appearFrame={685} fadeOutFrame={700} fadeOutDur={7} />

      {/* "The right things." — 52px */}
      <Word text="The"     x={850}  y={520} appearFrame={700} fadeOutFrame={770} fadeOutDur={14} fontSize={52} color={IVORY} />
      <Word text="right"   x={950}  y={520} appearFrame={705} fadeOutFrame={770} fadeOutDur={14} fontSize={52} color={IVORY} />
      <Word text="things." x={1058} y={520} appearFrame={710} fadeOutFrame={770} fadeOutDur={14} fontSize={52} color={IVORY} />

      {/* Three briefing lines */}
      <BriefingLine
        dotX={680} dotY={606} textX={700} textY={602}
        text="Follow up with Marcus — 2 weeks overdue."
        appearFrame={714} fadeOutFrame={770} fadeOutDur={14}
      />
      <BriefingLine
        dotX={680} dotY={642} textX={700} textY={638}
        text="Sarah hasn't heard from you in 47 days."
        appearFrame={724} fadeOutFrame={770} fadeOutDur={14}
      />
      <BriefingLine
        dotX={680} dotY={678} textX={700} textY={674}
        text="Ahmed is still waiting on your reply."
        appearFrame={734} fadeOutFrame={770} fadeOutDur={14}
      />
    </>
  );
};
