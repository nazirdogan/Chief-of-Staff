import React from "react";

interface Props {
  opacity?: number;
  scale?: number;
  blur?: number;
}

// ELEM — Contact Name Card (TARGET C base appearance in Act 1)
// 300×70px, fill #1A2A1A 85%, left border 4px solid #4A9A6A, radius 8px
export const ElemContactCard: React.FC<Props> = ({
  opacity = 1,
  scale = 1,
  blur = 0,
}) => (
  <div
    style={{
      width: 300,
      height: 70,
      background: "rgba(26, 42, 26, 0.85)",
      borderRadius: 8,
      borderLeft: "4px solid #4A9A6A",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "0 14px",
      gap: 6,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: "center",
      filter: blur > 0 ? `blur(${blur}px)` : undefined,
      boxSizing: "border-box",
    }}
  >
    <div
      style={{
        height: 10,
        background: "#3A5A3A",
        borderRadius: 4,
        width: "60%",
      }}
    />
    <div
      style={{
        height: 8,
        background: "#2A4A2A",
        borderRadius: 4,
        width: "45%",
      }}
    />
  </div>
);
