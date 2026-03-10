import React from "react";
import { UI_FONT, TEXT_COLOR } from "../../constants";

interface Props {
  text: string;
  opacity?: number;
  scale?: number;
}

// ELEM-06 — Text Fragment
// Inter Regular, 18px, warm ivory at configurable opacity
export const ElemText: React.FC<Props> = ({
  text,
  opacity = 0.55,
  scale = 1,
}) => (
  <div
    style={{
      fontFamily: UI_FONT,
      fontSize: 18,
      fontWeight: 400,
      color: TEXT_COLOR,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: "left center",
      whiteSpace: "nowrap",
      userSelect: "none",
    }}
  >
    {text}
  </div>
);
