import React from "react";
import { RED_DOT } from "../../constants";

interface Props {
  opacity?: number;
  scale?: number;
}

// ELEM-05 — Unread Dot
// 10px diameter, fill #E85D5D
export const ElemDot: React.FC<Props> = ({ opacity = 1, scale = 1 }) => (
  <div
    style={{
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: RED_DOT,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: "center",
    }}
  />
);
