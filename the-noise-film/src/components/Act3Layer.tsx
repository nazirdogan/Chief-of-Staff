import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import {
  LIGHT_APPEAR, LIGHT_EXPAND_START,
  BG_ELEM_SPAWN_START, LIGHT_MOVE_START,
  WORDMARK_ACT3, SUBLINE_ACT3, LIGHT_JOURNEY_START,
  ACT3_WORDMARK_FADE_START, LIGHT_RETURN_START, ACT3_END,
  ACCENT, TEXT_COLOR, DISPLAY_FONT,
} from "../constants";
import { easeOutQuad, easeInQuad, easeInOutCubic, CLAMP } from "../utils";
import { ElemEmail } from "./elements/ElemEmail";
import { ElemCalendar } from "./elements/ElemCalendar";
import { ElemBubble } from "./elements/ElemBubble";
import { ElemPill } from "./elements/ElemPill";

// ─── LIGHT JOURNEY WAYPOINTS ──────────────────────────────────────────────────
// Pre-defined positions of background elements the light visits
const WAYPOINTS: Array<{ x: number; y: number }> = [
  { x: 350, y: 200 }, // start — top-left quadrant
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

// Background element types cycling
const BG_TYPES = ["email", "calendar", "bubble", "pill", "bubble", "email", "calendar", "pill",
  "email", "bubble", "calendar", "email", "pill", "bubble", "email", "calendar", "bubble"] as const;

// Frames per waypoint travel (0:39-0:48 = ~216 frames / 17 waypoints ≈ 12.7 frames each = ~0.53s)
const FRAMES_PER_WAYPOINT = 13;
const JOURNEY_DURATION = WAYPOINTS.length * FRAMES_PER_WAYPOINT; // ~221 frames

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getLightPosition(frame: number): { x: number; y: number } {
  // Phase 1: Appear at centre 0:35.50
  if (frame < LIGHT_MOVE_START) {
    return { x: 960, y: 540 };
  }

  // Phase 2: Travel to first waypoint from centre (0:39.00)
  const journeyElapsed = frame - LIGHT_MOVE_START;

  // First move: centre → waypoint[0]
  if (journeyElapsed < FRAMES_PER_WAYPOINT) {
    const p = interpolate(journeyElapsed, [0, FRAMES_PER_WAYPOINT], [0, 1], {
      ...CLAMP, easing: easeInOutCubic,
    });
    return {
      x: 960 + (WAYPOINTS[0].x - 960) * p,
      y: 540 + (WAYPOINTS[0].y - 540) * p,
    };
  }

  // Journey between waypoints
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

// ─── AMBIENT BACKGROUND ELEMENTS (Act 3 atmospheric) ─────────────────────────
const BgElement: React.FC<{ waypoint: { x: number; y: number }; idx: number; type: typeof BG_TYPES[number]; lightX: number; lightY: number }> = ({
  waypoint, idx, type, lightX, lightY,
}) => {
  const frame = useCurrentFrame();

  // Stagger spawn
  const spawnFrame = BG_ELEM_SPAWN_START + idx * 7; // ~0.3s apart
  if (frame < spawnFrame) return null;
  if (frame > ACT3_END) return null;

  // Fade in
  const fadeIn = interpolate(frame, [spawnFrame, spawnFrame + 36], [0, 0.1], {
    ...CLAMP, easing: easeOutQuad,
  });

  // Distance from light
  const dist = Math.sqrt(
    Math.pow(lightX - waypoint.x, 2) + Math.pow(lightY - waypoint.y, 2)
  );

  // When light is close (within 80px): element brightens then fades out
  const touchFrame =
    LIGHT_MOVE_START +
    FRAMES_PER_WAYPOINT +
    idx * FRAMES_PER_WAYPOINT;

  // Split into two phases to avoid duplicate values in inputRange
  const brightenUp = interpolate(frame, [touchFrame, touchFrame + 7], [0, 0.35], CLAMP);
  const brightenDown = interpolate(frame, [touchFrame + 8, touchFrame + 22], [0.35, 0], CLAMP);
  const brightenOp = frame <= touchFrame + 7 ? brightenUp : brightenDown;

  // If light has fully processed this waypoint, element is gone
  const isTouched = frame >= touchFrame + 22;
  const opacity = isTouched ? 0 : dist < 200 ? Math.max(fadeIn, brightenOp) : fadeIn;

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
const AmberLight: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < LIGHT_APPEAR || frame > ACT3_END) return null;

  const { x, y } = getLightPosition(frame);

  // Appear: 0px → 6px diameter (0:35.50 - 0:35.80 = frames 852-859)
  const dotSize = interpolate(frame, [LIGHT_APPEAR, LIGHT_APPEAR + 7], [0, 6], {
    ...CLAMP, easing: easeOutQuad,
  });

  // Expand: 6px → 28px (0:37.00 - 0:39.00 = frames 888-936)
  const expandedSize = interpolate(frame, [LIGHT_EXPAND_START, LIGHT_MOVE_START], [6, 28], {
    ...CLAMP, easing: easeInOutCubic,
  });

  // Contract at end: 28px → 4px (0:49.50 - 0:50.00 = frames 1188-1200)
  const contractSize = interpolate(frame, [LIGHT_RETURN_START, ACT3_END], [28, 0], {
    ...CLAMP, easing: Easing_inCubic,
  });

  const currentSize = frame < LIGHT_EXPAND_START
    ? dotSize
    : frame < LIGHT_RETURN_START
    ? expandedSize
    : contractSize;

  // Glow opacity (expand from 0:37)
  const glowOp = interpolate(frame, [LIGHT_EXPAND_START, LIGHT_MOVE_START], [0, 0.12], {
    ...CLAMP,
  });
  const glowFade = interpolate(frame, [LIGHT_RETURN_START, ACT3_END], [0.12, 0], { ...CLAMP });
  const finalGlowOp = frame < LIGHT_RETURN_START ? glowOp : glowFade;

  // Glow radius
  const glowRadius = interpolate(frame, [LIGHT_EXPAND_START, LIGHT_MOVE_START], [0, 120], {
    ...CLAMP,
  });

  // Overall opacity for contraction
  const lightOp = frame >= LIGHT_RETURN_START
    ? interpolate(frame, [LIGHT_RETURN_START, ACT3_END], [1, 0], { ...CLAMP, easing: easeInQuad })
    : 1;

  return (
    <>
      {/* Glow */}
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
      {/* Core dot */}
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

// Temporary shim — easeIn cubic via bezier
function Easing_inCubic(t: number): number {
  return t * t * t;
}

// ─── DONNA WORDMARK (ACT 3) ───────────────────────────────────────────────────
const WordmarkAct3: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < WORDMARK_ACT3 || frame > ACT3_END) return null;

  const appear = interpolate(frame, [WORDMARK_ACT3, WORDMARK_ACT3 + 12], [0, 1], {
    ...CLAMP, easing: easeOutQuad,
  });
  const scale = interpolate(appear, [0, 1], [0.96, 1.0], CLAMP);

  const fadeOut = interpolate(frame, [ACT3_WORDMARK_FADE_START, ACT3_WORDMARK_FADE_START + 24], [1, 0], {
    ...CLAMP, easing: easeInQuad,
  });

  const op = appear * fadeOut;

  const subOp =
    frame >= SUBLINE_ACT3
      ? interpolate(frame, [SUBLINE_ACT3, SUBLINE_ACT3 + 12], [0, 0.85], {
          ...CLAMP, easing: easeOutQuad,
        }) * fadeOut
      : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 260,
        transform: `translateX(-50%) scale(${scale})`,
        transformOrigin: "center",
        opacity: op,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Donna logo */}
      <Img
        src={staticFile("donna-wordmark.svg")}
        style={{ width: 520, height: "auto" }}
      />
      {/* Sub-line */}
      <div
        style={{
          fontFamily: DISPLAY_FONT,
          fontStyle: "italic",
          fontSize: 24,
          color: TEXT_COLOR,
          opacity: subOp / op || 0,
          whiteSpace: "nowrap",
        }}
      >
        She reads all of it.
      </div>
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export const Act3Layer: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < LIGHT_APPEAR || frame > ACT3_END) return null;

  const { x: lightX, y: lightY } = getLightPosition(frame);

  // Particle bursts at each waypoint touch
  const touchFrames = WAYPOINTS.map(
    (_, idx) => LIGHT_MOVE_START + FRAMES_PER_WAYPOINT + idx * FRAMES_PER_WAYPOINT
  );

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Atmospheric background elements */}
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

      {/* Particle bursts */}
      {touchFrames.map((tf, idx) => (
        <ParticleBurst key={idx} cx={WAYPOINTS[idx].x} cy={WAYPOINTS[idx].y} triggerFrame={tf} />
      ))}

      {/* Amber light */}
      <AmberLight />

      {/* Donna wordmark + sub-line */}
      <WordmarkAct3 />
    </div>
  );
};
