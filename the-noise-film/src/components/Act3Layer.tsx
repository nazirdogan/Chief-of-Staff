import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import {
  LIGHT_APPEAR, LIGHT_EXPAND_START,
  BG_ELEM_SPAWN_START, LIGHT_MOVE_START,
  LIGHT_RETURN_START, ACT3_END,
  ACCENT,
} from "../constants";
import { easeOutQuad, easeInQuad, easeInOutCubic, CLAMP } from "../utils";
import { ElemEmail } from "./elements/ElemEmail";
import { ElemCalendar } from "./elements/ElemCalendar";
import { ElemBubble } from "./elements/ElemBubble";
import { ElemPill } from "./elements/ElemPill";

// ─── LIGHT JOURNEY WAYPOINTS ──────────────────────────────────────────────────
const WAYPOINTS: Array<{ x: number; y: number }> = [
  { x: 350, y: 200 },
  { x: 1550, y: 300 },
  { x: 700, y: 180 },
  { x: 1200, y: 500 },
  { x: 280, y: 700 },
  { x: 900, y: 870 },
  { x: 1650, y: 650 },
  { x: 450, y: 430 },
  { x: 1380, y: 150 },
  { x: 680, y: 750 },
  { x: 1700, y: 800 },
  { x: 200, y: 350 },
  { x: 1050, y: 200 },
  { x: 800, y: 620 },
  { x: 1450, y: 450 },
  { x: 350, y: 900 },
  { x: 1100, y: 780 },
];

const BG_TYPES = ["email", "calendar", "bubble", "pill", "bubble", "email", "calendar", "pill",
  "email", "bubble", "calendar", "email", "pill", "bubble", "email", "calendar", "bubble"] as const;

const FRAMES_PER_WAYPOINT = 13;

function getLightPosition(frame: number): { x: number; y: number } {
  if (frame < LIGHT_MOVE_START) {
    return { x: 960, y: 540 };
  }

  const journeyElapsed = frame - LIGHT_MOVE_START;

  if (journeyElapsed < FRAMES_PER_WAYPOINT) {
    const p = interpolate(journeyElapsed, [0, FRAMES_PER_WAYPOINT], [0, 1], {
      ...CLAMP, easing: easeInOutCubic,
    });
    return {
      x: 960 + (WAYPOINTS[0].x - 960) * p,
      y: 540 + (WAYPOINTS[0].y - 540) * p,
    };
  }

  const idx = Math.min(
    Math.floor((journeyElapsed - FRAMES_PER_WAYPOINT) / FRAMES_PER_WAYPOINT),
    WAYPOINTS.length - 2
  );
  const segElapsed = (journeyElapsed - FRAMES_PER_WAYPOINT) % FRAMES_PER_WAYPOINT;
  const p = interpolate(segElapsed, [0, FRAMES_PER_WAYPOINT], [0, 1], {
    ...CLAMP, easing: easeInOutCubic,
  });
  const from = WAYPOINTS[Math.min(idx, WAYPOINTS.length - 1)];
  const to = WAYPOINTS[Math.min(idx + 1, WAYPOINTS.length - 1)];

  return {
    x: from.x + (to.x - from.x) * p,
    y: from.y + (to.y - from.y) * p,
  };
}

// ─── AMBIENT BACKGROUND ELEMENTS ─────────────────────────────────────────────
const BgElement: React.FC<{
  waypoint: { x: number; y: number };
  idx: number;
  type: typeof BG_TYPES[number];
  lightX: number;
  lightY: number;
}> = ({ waypoint, idx, type, lightX, lightY }) => {
  const frame = useCurrentFrame();

  const spawnFrame = BG_ELEM_SPAWN_START + idx * 7;
  if (frame < spawnFrame) return null;
  if (frame > ACT3_END) return null;

  const fadeIn = interpolate(frame, [spawnFrame, spawnFrame + 36], [0, 0.1], {
    ...CLAMP, easing: easeOutQuad,
  });

  // Fade out when CTA opens (frame 984 → ACT3_END)
  const ctaFadeOut = interpolate(frame, [LIGHT_RETURN_START, ACT3_END], [1, 0], {
    ...CLAMP, easing: easeInQuad,
  });

  const dist = Math.sqrt(
    Math.pow(lightX - waypoint.x, 2) + Math.pow(lightY - waypoint.y, 2)
  );

  const touchFrame =
    LIGHT_MOVE_START +
    FRAMES_PER_WAYPOINT +
    idx * FRAMES_PER_WAYPOINT;

  const brightenUp = interpolate(frame, [touchFrame, touchFrame + 7], [0, 0.35], CLAMP);
  const brightenDown = interpolate(frame, [touchFrame + 8, touchFrame + 22], [0.35, 0], CLAMP);
  const brightenOp = frame <= touchFrame + 7 ? brightenUp : brightenDown;

  const isTouched = frame >= touchFrame + 22;
  const baseOpacity = isTouched ? 0 : dist < 200 ? Math.max(fadeIn, brightenOp) : fadeIn;
  const opacity = baseOpacity * ctaFadeOut;

  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: waypoint.x,
        top: waypoint.y,
        transform: "translate(-50%, -50%)",
        filter: "blur(6px)",
        opacity,
      }}
    >
      {type === "email" && <ElemEmail />}
      {type === "calendar" && <ElemCalendar />}
      {type === "bubble" && <ElemBubble />}
      {type === "pill" && <ElemPill />}
    </div>
  );
};

// ─── PARTICLE BURST ───────────────────────────────────────────────────────────
const ParticleBurst: React.FC<{ cx: number; cy: number; triggerFrame: number }> = ({
  cx, cy, triggerFrame,
}) => {
  const frame = useCurrentFrame();
  if (frame < triggerFrame || frame > triggerFrame + 10) return null;

  const elapsed = frame - triggerFrame;
  const ANGLES = [0, 60, 120, 180, 240, 300];

  return (
    <>
      {ANGLES.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dist = interpolate(elapsed, [0, 10], [0, 30], { ...CLAMP });
        const op = interpolate(elapsed, [0, 10], [1, 0], { ...CLAMP });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cx + Math.cos(rad) * dist,
              top: cy + Math.sin(rad) * dist,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: ACCENT,
              opacity: op,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </>
  );
};

// ─── AMBER LIGHT ─────────────────────────────────────────────────────────────
function easeInCubic(t: number): number {
  return t * t * t;
}

const AmberLight: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < LIGHT_APPEAR || frame > ACT3_END) return null;

  const { x, y } = getLightPosition(frame);

  const dotSize = interpolate(frame, [LIGHT_APPEAR, LIGHT_APPEAR + 7], [0, 6], {
    ...CLAMP, easing: easeOutQuad,
  });

  const expandedSize = interpolate(frame, [LIGHT_EXPAND_START, LIGHT_MOVE_START], [6, 28], {
    ...CLAMP, easing: easeInOutCubic,
  });

  // Contract and fade when CTA opens (0.80s = ~19 frames)
  const contractSize = interpolate(frame, [LIGHT_RETURN_START, ACT3_END], [28, 0], {
    ...CLAMP, easing: easeInCubic,
  });

  const currentSize = frame < LIGHT_EXPAND_START
    ? dotSize
    : frame < LIGHT_RETURN_START
    ? expandedSize
    : contractSize;

  const glowOp = interpolate(frame, [LIGHT_EXPAND_START, LIGHT_MOVE_START], [0, 0.12], {
    ...CLAMP,
  });
  const glowFade = interpolate(frame, [LIGHT_RETURN_START, ACT3_END], [0.12, 0], { ...CLAMP });
  const finalGlowOp = frame < LIGHT_RETURN_START ? glowOp : glowFade;

  const glowRadius = interpolate(frame, [LIGHT_EXPAND_START, LIGHT_MOVE_START], [0, 120], {
    ...CLAMP,
  });

  const lightOp = frame >= LIGHT_RETURN_START
    ? interpolate(frame, [LIGHT_RETURN_START, ACT3_END], [1, 0], { ...CLAMP, easing: easeInQuad })
    : 1;

  return (
    <>
      {finalGlowOp > 0 && (
        <div
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: glowRadius * 2,
            height: glowRadius * 2,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(196,145,74,${finalGlowOp}) 0%, transparent 70%)`,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: currentSize,
          height: currentSize,
          borderRadius: "50%",
          background: ACCENT,
          transform: "translate(-50%, -50%)",
          opacity: lightOp,
        }}
      />
    </>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export const Act3Layer: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < LIGHT_APPEAR || frame > ACT3_END) return null;

  const { x: lightX, y: lightY } = getLightPosition(frame);

  const touchFrames = WAYPOINTS.map(
    (_, idx) => LIGHT_MOVE_START + FRAMES_PER_WAYPOINT + idx * FRAMES_PER_WAYPOINT
  );

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {WAYPOINTS.map((wp, idx) => (
        <BgElement
          key={idx}
          waypoint={wp}
          idx={idx}
          type={BG_TYPES[idx]}
          lightX={lightX}
          lightY={lightY}
        />
      ))}

      {touchFrames.map((tf, idx) => (
        <ParticleBurst key={idx} cx={WAYPOINTS[idx].x} cy={WAYPOINTS[idx].y} triggerFrame={tf} />
      ))}

      <AmberLight />
    </div>
  );
};
