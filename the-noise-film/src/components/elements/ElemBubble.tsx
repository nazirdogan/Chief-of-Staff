import React from "react";

interface Props {
  opacity?: number;
  scale?: number;
  blur?: number;
}

// ELEM-03 — Message Bubble
// 280×90px, fill #2A2A3E 80%, radius 18px (iOS-style)
export const ElemBubble: React.FC<Props> = ({
  opacity = 1,
  scale = 1,
  blur = 0,
}) => (
  <div
    style={{
      width: 280,
      height: 90,
      background: "rgba(42, 42, 62, 0.8)",
      borderRadius: 18,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "0 16px",
      gap: 8,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: "center",
      filter: blur > 0 ? `blur(${blur}px)` : undefined,
      position: "relative",
      boxSizing: "border-box",
    }}
  >
    <div
      style={{
        height: 10,
        background: "#4A4A6A",
        borderRadius: 5,
        width: "85%",
      }}
    />
    <div
      style={{
        height: 8,
        background: "#3A3A5A",
        borderRadius: 4,
        width: "70%",
      }}
    />
    {/* Pointer nub bottom-right */}
    <div
      style={{
        position: "absolute",
        bottom: 0,
        right: 16,
        width: 0,
        height: 0,
        borderLeft: "8px solid transparent",
        borderTop: "12px solid rgba(42, 42, 62, 0.8)",
        transform: "translateY(100%)",
      }}
    />
  </div>
);
