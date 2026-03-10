import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface TextOverlayProps {
  text: string;
  startFrame: number;
  durationFrames: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  position?: 'center' | 'top' | 'bottom';
  fadeInDuration?: number;
  fadeOutDuration?: number;
  maxWidth?: number;
  letterSpacing?: string;
  lineHeight?: number;
  shadow?: boolean;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({
  text,
  startFrame,
  durationFrames,
  fontSize = 48,
  color = '#2D2D2D',
  fontFamily = '"Playfair Display", serif',
  fontWeight = 700,
  position = 'center',
  fadeInDuration = 12,
  fadeOutDuration = 10,
  maxWidth = 900,
  letterSpacing = '-0.02em',
  lineHeight = 1.3,
  shadow = false,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  if (relativeFrame < 0 || relativeFrame >= durationFrames) return null;

  const opacity = interpolate(
    relativeFrame,
    [0, fadeInDuration, durationFrames - fadeOutDuration, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(
    relativeFrame,
    [0, fadeInDuration],
    [20, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const topMap = {
    center: '50%',
    top: '12%',
    bottom: '82%',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: topMap[position],
        left: '50%',
        transform: `translate(-50%, -50%) translateY(${translateY}px)`,
        opacity,
        fontSize,
        color,
        fontFamily,
        fontWeight,
        textAlign: 'center',
        maxWidth,
        letterSpacing,
        lineHeight,
        zIndex: 100,
        textShadow: shadow ? '0 2px 20px rgba(0,0,0,0.15)' : undefined,
        whiteSpace: 'pre-line',
      }}
    >
      {text}
    </div>
  );
};
