import React from "react";
import { useCurrentFrame } from "remotion";
import { ALL_ELEMENTS } from "../elementData";
import { SpawnableElement } from "../types";
import { entryAnimation, driftedPos, nonTargetOpacity, nonTargetBlur } from "../utils";
import { ElemEmail } from "./elements/ElemEmail";
import { ElemCalendar } from "./elements/ElemCalendar";
import { ElemBubble } from "./elements/ElemBubble";
import { ElemPill } from "./elements/ElemPill";
import { ElemDot } from "./elements/ElemDot";
import { ElemText } from "./elements/ElemText";
import { ElemContactCard } from "./elements/ElemContactCard";

const ENTRY_FRAMES = 5;

function renderElem(elem: SpawnableElement, opacity: number, scale: number, blur: number) {
  switch (elem.type) {
    case "email":
      return <ElemEmail opacity={opacity} scale={scale} blur={blur} />;
    case "calendar":
      return <ElemCalendar opacity={opacity} scale={scale} blur={blur} />;
    case "bubble":
      return <ElemBubble opacity={opacity} scale={scale} blur={blur} />;
    case "pill":
      return <ElemPill opacity={opacity} scale={scale} blur={blur} />;
    case "dot":
      return <ElemDot opacity={opacity} scale={scale} />;
    case "text":
      return (
        <ElemText
          text={elem.text ?? ""}
          opacity={opacity * (elem.textOpacity ?? 0.55)}
          scale={scale}
        />
      );
    case "contactCard":
      return <ElemContactCard opacity={opacity} scale={scale} blur={blur} />;
    default:
      return null;
  }
}

const SingleElement: React.FC<{ elem: SpawnableElement }> = ({ elem }) => {
  const frame = useCurrentFrame();

  if (frame < elem.spawnFrame) return null;
  // Fade out completely after act2 end — skip rendering
  if (frame > 840) return null;

  const elapsed = frame - elem.spawnFrame;

  // Entry animation
  const { opacity: entryOp, scale: entryScale } = entryAnimation(elapsed, ENTRY_FRAMES);

  // Drift position
  const { cx, cy } = driftedPos(
    elem.x, elem.y,
    elem.driftX, elem.driftY,
    elem.driftDur,
    elem.spawnFrame,
    frame
  );

  // Target elements (A, B, C) are hidden from this layer after Act 2 begins
  // (they appear in Act2Targets instead)
  const isTarget = elem.isTargetA || elem.isTargetB || elem.isTargetC;

  let finalOpacity: number;
  let blur = 0;

  if (isTarget) {
    // Target elements fade in normally during Act 1, then hand off to Act2Targets at frame 444
    if (frame >= 444) return null;
    finalOpacity = entryOp;
  } else {
    const act2op = nonTargetOpacity(frame);
    blur = nonTargetBlur(frame);
    finalOpacity = entryOp * act2op;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        transform: `translate(-50%, -50%) scale(${entryScale})`,
        transformOrigin: "center center",
      }}
    >
      {renderElem(elem, finalOpacity, 1, blur)}
    </div>
  );
};

export const ChaosLayer: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}
    >
      {ALL_ELEMENTS.map((elem) => (
        <SingleElement key={elem.id} elem={elem} />
      ))}
    </div>
  );
};
