import React from "react";
import { ACCENT } from "../../constants";

interface Props {
  opacity?: number;
  scale?: number;
  blur?: number;
}

// ELEM-01 — Email Notification
// 340×76px, fill #1A1A2E 85%, border 1px #3A3A5C, radius 12px
export const ElemEmail: React.FC<Props> = ({
  opacity = 1,
  scale = 1,
  blur = 0,
}) => (
  <div
    style={{
      width: 340,
      height: 76,
      background: "rgba(26, 26, 46, 0.85)",
      border: "1px solid #3A3A5C",
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      padding: "0 14px",
      gap: 12,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: "center",
      filter: blur > 0 ? `blur(${blur}px)` : undefined,
      boxSizing: "border-box",
    }}
  >
    {/* Sender initials circle */}
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: ACCENT,
        flexShrink: 0,
      }}
    />
    {/* Blurred text lines (visual placeholder) */}
    <div
      style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}
    >
      <div
        style={{
          height: 10,
          background: "#4A4A6A",
          borderRadius: 5,
          width: "80%",
        }}
      />
      <div
        style={{
          height: 8,
          background: "#3A3A5A",
          borderRadius: 4,
          width: "60%",
        }}
      />
    </div>
  </div>
);
