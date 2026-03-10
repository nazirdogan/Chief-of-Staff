import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import {
  TARGET_A_FROZEN, TARGET_B_FROZEN, TARGET_C_FROZEN,
} from "../elementData";
import {
  TARGET_A_DEST, TARGET_B_DEST, TARGET_C_DEST,
  TARGET_A_MOVE_START, TARGET_A_MOVE_END, TARGET_A_TRANSFORM,
  TARGET_B_MOVE_START, TARGET_B_MOVE_END, TARGET_B_TRANSFORM,
  TARGET_C_MOVE_START, TARGET_C_MOVE_END, TARGET_C_TRANSFORM,
  LABELS_APPEAR_A, LABELS_APPEAR_B, LABELS_APPEAR_C,
  CENTRE_TEXT_APPEAR,
  ACT2_FADE_START, ACT2_END,
  ACCENT, TEXT_COLOR, DISPLAY_FONT, UI_FONT,
} from "../constants";
import { easeInOutCubic, easeOutQuad, easeInQuad, CLAMP } from "../utils";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function moveInterp(frame: number, start: number, end: number) {
  return interpolate(frame, [start, end], [0, 1], {
    ...CLAMP,
    easing: easeInOutCubic,
  });
}

function fadeIn(frame: number, start: number, dur = 14) {
  return interpolate(frame, [start, start + dur], [0, 1], {
    ...CLAMP,
    easing: easeOutQuad,
  });
}

function globalFadeOut(frame: number) {
  return interpolate(frame, [ACT2_FADE_START, ACT2_END], [1, 0], {
    ...CLAMP,
    easing: easeInQuad,
  });
}

// ─── TARGET A — Message Thread ────────────────────────────────────────────────
const TargetA: React.FC = () => {
  const frame = useCurrentFrame();

  // Only show from frame 444 (hand-off from ChaosLayer)
  if (frame < 444 || frame > ACT2_END) return null;

  const moveP = moveInterp(frame, TARGET_A_MOVE_START, TARGET_A_MOVE_END);
  const cx = TARGET_A_FROZEN.x + (TARGET_A_DEST.x - TARGET_A_FROZEN.x) * moveP;
  const cy = TARGET_A_FROZEN.y + (TARGET_A_DEST.y - TARGET_A_FROZEN.y) * moveP;
  const scale = interpolate(moveP, [0, 1], [1, 1.15], CLAMP);

  // Transform to readable content at 0:21.00 (frame 504)
  const contentReveal = interpolate(frame, [TARGET_A_TRANSFORM, TARGET_A_TRANSFORM + 7], [0, 1], {
    ...CLAMP,
    easing: easeOutQuad,
  });
  const gFade = globalFadeOut(frame);

  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center",
        opacity: gFade,
        zIndex: 10,
      }}
    >
      {/* Bubble: 280×90px */}
      <div
        style={{
          width: 280,
          height: 90,
          background: "rgba(42, 42, 62, 0.9)",
          borderRadius: 18,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 16px",
          gap: 8,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* Before transform: blurred lines */}
        <div style={{ opacity: 1 - contentReveal }}>
          <div style={{ height: 10, background: "#4A4A6A", borderRadius: 5, width: "85%", marginBottom: 8 }} />
          <div style={{ height: 8, background: "#3A3A5A", borderRadius: 4, width: "70%" }} />
        </div>

        {/* After transform: readable content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "10px 14px",
            opacity: contentReveal,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Sender row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#1A6A6A",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: UI_FONT,
                fontSize: 11,
                fontWeight: 500,
                color: TEXT_COLOR,
              }}
            >
              M
            </div>
            <div style={{ height: 8, background: "#4A4A6A", borderRadius: 4, flex: 1 }} />
          </div>
          {/* Timestamp */}
          <div
            style={{
              fontFamily: UI_FONT,
              fontSize: 13,
              color: TEXT_COLOR,
              opacity: 0.9,
            }}
          >
            5 weeks ago
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── TARGET B — Calendar Reminder ─────────────────────────────────────────────
const TargetB: React.FC = () => {
  const frame = useCurrentFrame();

  if (frame < 444 || frame > ACT2_END) return null;

  const moveP = moveInterp(frame, TARGET_B_MOVE_START, TARGET_B_MOVE_END);
  const cx = TARGET_B_FROZEN.x + (TARGET_B_DEST.x - TARGET_B_FROZEN.x) * moveP;
  const cy = TARGET_B_FROZEN.y + (TARGET_B_DEST.y - TARGET_B_FROZEN.y) * moveP;
  const scale = interpolate(moveP, [0, 1], [1, 1.15], CLAMP);

  const contentReveal = interpolate(frame, [TARGET_B_TRANSFORM, TARGET_B_TRANSFORM + 7], [0, 1], {
    ...CLAMP,
    easing: easeOutQuad,
  });
  const gFade = globalFadeOut(frame);

  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center",
        opacity: gFade,
        zIndex: 10,
      }}
    >
      {/* Pill: 220×44px */}
      <div
        style={{
          width: 220,
          height: 44,
          background: "rgba(46, 26, 58, 0.9)",
          border: "1px solid #7A4A9A",
          borderRadius: 22,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 14px",
          gap: 5,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <div style={{ opacity: 1 - contentReveal }}>
          <div style={{ height: 9, background: "#6A4A7A", borderRadius: 4 }} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "0 14px",
            opacity: contentReveal,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: UI_FONT,
              fontSize: 15,
              fontWeight: 500,
              color: TEXT_COLOR,
              lineHeight: 1,
            }}
          >
            Follow up — Ahmed
          </div>
          {/* Snoozed badge */}
          <div style={{ display: "flex" }}>
            <div
              style={{
                fontFamily: UI_FONT,
                fontSize: 11,
                color: ACCENT,
                background: "rgba(196, 145, 74, 0.15)",
                borderRadius: 8,
                padding: "1px 6px",
              }}
            >
              Snoozed × 3
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── TARGET C — Contact Name Card ─────────────────────────────────────────────
const TargetC: React.FC = () => {
  const frame = useCurrentFrame();

  if (frame < 444 || frame > ACT2_END) return null;

  const moveP = moveInterp(frame, TARGET_C_MOVE_START, TARGET_C_MOVE_END);
  const cx = TARGET_C_FROZEN.x + (TARGET_C_DEST.x - TARGET_C_FROZEN.x) * moveP;
  const cy = TARGET_C_FROZEN.y + (TARGET_C_DEST.y - TARGET_C_FROZEN.y) * moveP;
  const scale = interpolate(moveP, [0, 1], [1, 1.15], CLAMP);

  const contentReveal = interpolate(frame, [TARGET_C_TRANSFORM, TARGET_C_TRANSFORM + 7], [0, 1], {
    ...CLAMP,
    easing: easeOutQuad,
  });
  const gFade = globalFadeOut(frame);

  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center",
        opacity: gFade,
        zIndex: 10,
      }}
    >
      {/* Card: 300×70px */}
      <div
        style={{
          width: 300,
          height: 70,
          background: "rgba(26, 42, 26, 0.9)",
          borderRadius: 8,
          borderLeft: "4px solid #4A9A6A",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 14px",
          gap: 6,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <div style={{ opacity: 1 - contentReveal }}>
          <div style={{ height: 10, background: "#3A5A3A", borderRadius: 4, width: "60%", marginBottom: 6 }} />
          <div style={{ height: 8, background: "#2A4A2A", borderRadius: 4, width: "45%" }} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "0 14px",
            opacity: contentReveal,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: UI_FONT,
              fontSize: 15,
              fontWeight: 500,
              color: TEXT_COLOR,
            }}
          >
            Sarah K.
          </div>
          <div
            style={{
              fontFamily: UI_FONT,
              fontSize: 13,
              color: TEXT_COLOR,
              opacity: 0.65,
            }}
          >
            Last contact: 47 days ago
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── LABELS ───────────────────────────────────────────────────────────────────
const LabelLine: React.FC<{
  text: string;
  cx: number;
  cardBottomY: number;
  cardHalfH: number;
  appearFrame: number;
  globalFade: number;
}> = ({ text, cx, cardBottomY, cardHalfH, appearFrame, globalFade }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [appearFrame, appearFrame + 14], [0, 0.8], {
    ...CLAMP,
    easing: easeOutQuad,
  });
  const labelY = cardBottomY + cardHalfH + 14;

  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: labelY,
        transform: "translateX(-50%)",
        opacity: op * globalFade,
        fontFamily: DISPLAY_FONT,
        fontStyle: "italic",
        fontSize: 16,
        color: TEXT_COLOR,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};

// ─── CENTRE TEXT ──────────────────────────────────────────────────────────────
const CentreText: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < CENTRE_TEXT_APPEAR || frame > ACT2_END) return null;

  const op = interpolate(frame, [CENTRE_TEXT_APPEAR, CENTRE_TEXT_APPEAR + 19], [0, 1], {
    ...CLAMP,
    easing: easeOutQuad,
  });
  const gFade = globalFadeOut(frame);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 680,
        transform: "translateX(-50%)",
        opacity: op * gFade,
        fontFamily: DISPLAY_FONT,
        fontSize: 26,
        color: TEXT_COLOR,
        whiteSpace: "nowrap",
        textAlign: "center",
      }}
    >
      This is what falls through the cracks.
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export const Act2Targets: React.FC = () => {
  const frame = useCurrentFrame();
  const gFade = globalFadeOut(frame);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <TargetA />
      <TargetB />
      <TargetC />

      {/* Labels — appear after all three are settled */}
      <LabelLine
        text="Unreplied. 5 weeks."
        cx={TARGET_A_DEST.x}
        cardBottomY={TARGET_A_DEST.y}
        cardHalfH={45}
        appearFrame={LABELS_APPEAR_A}
        globalFade={gFade}
      />
      <LabelLine
        text="Kept waiting."
        cx={TARGET_B_DEST.x}
        cardBottomY={TARGET_B_DEST.y}
        cardHalfH={22}
        appearFrame={LABELS_APPEAR_B}
        globalFade={gFade}
      />
      <LabelLine
        text="Gone cold."
        cx={TARGET_C_DEST.x}
        cardBottomY={TARGET_C_DEST.y}
        cardHalfH={35}
        appearFrame={LABELS_APPEAR_C}
        globalFade={gFade}
      />

      <CentreText />
    </div>
  );
};
