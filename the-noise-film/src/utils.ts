import { interpolate, Easing } from "remotion";

// Ease Out Quad
export const easeOutQuad = Easing.out(Easing.quad);
// Ease In Quad
export const easeInQuad = Easing.in(Easing.quad);
// Ease In-Out Cubic (CSS equivalent via bezier)
export const easeInOutCubic = Easing.bezier(0.645, 0.045, 0.355, 1.0);

/** Clamp extrapolation on both sides */
export const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

/** Non-target element opacity curve across the full film */
export function nonTargetOpacity(frame: number): number {
  if (frame < 444) return 1;
  if (frame < 480)
    return interpolate(frame, [444, 480], [1, 0.3], {
      ...CLAMP,
      easing: easeInQuad,
    });
  if (frame < 624) return 0.3;
  if (frame < 648)
    return interpolate(frame, [624, 648], [0.3, 0.15], CLAMP);
  if (frame < 804) return 0.08;
  if (frame < 840)
    return interpolate(frame, [804, 840], [0.08, 0], {
      ...CLAMP,
      easing: easeInQuad,
    });
  return 0;
}

/** Non-target blur px curve */
export function nonTargetBlur(frame: number): number {
  if (frame < 444) return 0;
  if (frame < 480)
    return interpolate(frame, [444, 480], [0, 8], {
      ...CLAMP,
      easing: easeInQuad,
    });
  return 8;
}

/** Entry animation — returns { opacity, scale } driven from frame relative to spawnFrame */
export function entryAnimation(
  elapsed: number,
  entryFrames = 5
): { opacity: number; scale: number } {
  const p = interpolate(elapsed, [0, entryFrames], [0, 1], {
    ...CLAMP,
    easing: easeOutQuad,
  });
  return {
    opacity: p,
    scale: interpolate(p, [0, 1], [0.92, 1.0], CLAMP),
  };
}

/** Compute drifted centre position at a given frame */
export function driftedPos(
  x: number,
  y: number,
  driftX: number,
  driftY: number,
  driftDur: number,
  spawnFrame: number,
  frame: number,
  freezeFrame = 432
): { cx: number; cy: number } {
  const at = Math.min(frame, freezeFrame);
  const elapsed = Math.max(0, at - spawnFrame);
  const p = driftDur > 0 ? Math.min(elapsed / driftDur, 1) : 0;
  return { cx: x + driftX * p, cy: y + driftY * p };
}
