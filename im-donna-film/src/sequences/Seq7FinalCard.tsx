import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { IVORY, AMBER, UI_FONT, BG, CTA_APPEAR, URL_APPEAR, SEQ7_START, SEQ7_END } from "../constants";
import { CLAMP, easeOutQuad } from "../utils";

// Seq 7: frames 940–1152  (0:39.2–0:48.0)
// DonnaHeader closes to centre and "she already knows" appears (handled by DonnaHeader component).
// This layer adds: "Get Early Access" button + "www.imdonna.app" URL

export const Seq7FinalCard: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < SEQ7_START || frame > SEQ7_END) return null;

  const ctaOpacity = interpolate(
    frame,
    [CTA_APPEAR, CTA_APPEAR + 18],
    [0, 1],
    { ...CLAMP, easing: easeOutQuad }
  );

  const urlOpacity = interpolate(
    frame,
    [URL_APPEAR, URL_APPEAR + 14],
    [0, 0.55],
    { ...CLAMP, easing: easeOutQuad }
  );

  // Subtle scale-in on the button
  const ctaScale = interpolate(
    frame,
    [CTA_APPEAR, CTA_APPEAR + 18],
    [0.94, 1],
    { ...CLAMP, easing: easeOutQuad }
  );

  if (frame < CTA_APPEAR) return null;

  return (
    <>
      {/* "Get Early Access" button */}
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 660,
          transform: `translate(-50%, -50%) scale(${ctaScale})`,
          transformOrigin: "center center",
          opacity: ctaOpacity,
          backgroundColor: AMBER,
          borderRadius: 40,
          padding: "0 52px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontFamily: UI_FONT,
            fontSize: 20,
            fontWeight: 500,
            color: BG,
            letterSpacing: "0.06em",
          }}
        >
          Get Early Access
        </span>
      </div>

      {/* "www.imdonna.app" */}
      {frame >= URL_APPEAR && (
        <div
          style={{
            position: "absolute",
            left: 960,
            top: 726,
            transform: "translate(-50%, -50%)",
            opacity: urlOpacity,
            fontFamily: UI_FONT,
            fontSize: 16,
            fontWeight: 400,
            color: IVORY,
            letterSpacing: "0.10em",
            whiteSpace: "nowrap",
          }}
        >
          www.imdonna.app
        </div>
      )}
    </>
  );
};
