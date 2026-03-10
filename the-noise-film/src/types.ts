export type ElementType =
  | "email"
  | "calendar"
  | "bubble"
  | "pill"
  | "dot"
  | "text"
  | "contactCard";

export interface SpawnableElement {
  id: string;
  type: ElementType;
  spawnFrame: number;
  x: number; // centre X
  y: number; // centre Y
  driftX: number; // total drift px over driftDur
  driftY: number;
  driftDur: number; // frames
  text?: string; // for type=text
  textOpacity?: number; // base opacity for ELEM-06
  isTargetA?: boolean;
  isTargetB?: boolean;
  isTargetC?: boolean;
}
