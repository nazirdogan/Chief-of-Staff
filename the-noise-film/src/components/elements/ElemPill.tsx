import React from "react";

interface Props {
  opacity?: number;
  scale?: number;
  blur?: number;
}

// ELEM-04 — Reminder Pill
// 220×44px, fill #2E1A3A 85%, border 1px #7A4A9A, radius 22px
export const ElemPill: React.FC<Props> = ({
  opacity = 1,
  scale = 1,
  blur = 0,
}) => (
  <div
    style={{
      width: 220,
      height: 44,
      background: "rgba(46, 26, 58, 0.85)",
      border: "1px solid #7A4A9A",
      borderRadius: 22,
      display: "flex",
      alignItems: "center",
      padding: "0 14px",
      gap: 10,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: "center",
      filter: blur > 0 ? `blur(${blur}px)` : undefined,
      boxSizing: "border-box",
    }}
  >
    {/* Bell icon placeholder */}
    <div
      style={{
        width: 16,
        height: 16,
        background: "#8A6A9A",
        borderRadius: 3,
        flexShrink: 0,
      }}
    />
    <div
      style={{
        height: 9,
        background: "#6A4A7A",
        borderRadius: 4,
        flex: 1,
      }}
    />
  </div>
);
