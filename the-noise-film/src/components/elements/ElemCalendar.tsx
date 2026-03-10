import React from "react";

interface Props {
  opacity?: number;
  scale?: number;
  blur?: number;
}

// ELEM-02 — Calendar Block
// 300×58px, fill #1E2D4A 80%, left border 4px solid #C4914A, radius 8px
export const ElemCalendar: React.FC<Props> = ({
  opacity = 1,
  scale = 1,
  blur = 0,
}) => (
  <div
    style={{
      width: 300,
      height: 58,
      background: "rgba(30, 45, 74, 0.8)",
      borderRadius: 8,
      borderLeft: "4px solid #C4914A",
      display: "flex",
      alignItems: "center",
      padding: "0 14px",
      justifyContent: "space-between",
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: "center",
      filter: blur > 0 ? `blur(${blur}px)` : undefined,
      boxSizing: "border-box",
    }}
  >
    {/* Text line placeholder */}
    <div
      style={{
        height: 10,
        background: "#4A5A7A",
        borderRadius: 4,
        width: "65%",
      }}
    />
    {/* Clock icon — circle outline */}
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        border: "2px solid #6A7A9A",
        flexShrink: 0,
      }}
    />
  </div>
);
