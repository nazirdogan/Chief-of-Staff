import { interpolate } from "remotion";
export const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
export const easeInQuad = (t: number) => t * t;
export const easeInOutCubic = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;

export function fadeIn(frame: number, start: number, dur: number, targetOp = 1) {
  return interpolate(frame, [start, start + dur], [0, targetOp], { ...CLAMP, easing: easeOutQuad });
}
export function fadeOut(frame: number, start: number, dur: number, fromOp = 1) {
  return interpolate(frame, [start, start + dur], [fromOp, 0], { ...CLAMP, easing: easeInQuad });
}
