import React from 'react';
import { Composition } from 'remotion';
import { DonnaDemo } from './DonnaDemo';
import { DonnaDemoV2 } from './DonnaDemoV2';
import { DonnaDemoV3 } from './DonnaDemoV3';
import { DonnaDemoV4 } from './DonnaDemoV4';
import { DonnaDemoV5 } from './DonnaDemoV5';
import { DonnaDemoV6 } from './DonnaDemoV6';
import { DonnaDemoV7 } from './DonnaDemoV7';
import { DURATION_FRAMES, FPS, WIDTH, HEIGHT } from './constants';
import {
  DURATION_FRAMES as V2_DURATION,
  FPS as V2_FPS,
  WIDTH as V2_WIDTH,
  HEIGHT as V2_HEIGHT,
} from './constants-v2';
import {
  DURATION_FRAMES as V3_DURATION,
  FPS as V3_FPS,
  WIDTH as V3_WIDTH,
  HEIGHT as V3_HEIGHT,
} from './constants-v3';
import {
  DURATION_FRAMES as V4_DURATION,
  FPS as V4_FPS,
  WIDTH as V4_WIDTH,
  HEIGHT as V4_HEIGHT,
} from './constants-v4';
import {
  DURATION_FRAMES as V5_DURATION,
  FPS as V5_FPS,
  WIDTH as V5_WIDTH,
  HEIGHT as V5_HEIGHT,
} from './constants-v5';
import {
  DURATION_FRAMES as V6_DURATION,
  FPS as V6_FPS,
  WIDTH as V6_WIDTH,
  HEIGHT as V6_HEIGHT,
} from './constants-v6';
import {
  DURATION_FRAMES as V7_DURATION,
  FPS as V7_FPS,
  WIDTH as V7_WIDTH,
  HEIGHT as V7_HEIGHT,
} from './constants-v7';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="DonnaDemo"
        component={DonnaDemo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="DonnaDemoV2"
        component={DonnaDemoV2}
        durationInFrames={V2_DURATION}
        fps={V2_FPS}
        width={V2_WIDTH}
        height={V2_HEIGHT}
      />
      <Composition
        id="DonnaDemoV3"
        component={DonnaDemoV3}
        durationInFrames={V3_DURATION}
        fps={V3_FPS}
        width={V3_WIDTH}
        height={V3_HEIGHT}
      />
      <Composition
        id="DonnaDemoV4"
        component={DonnaDemoV4}
        durationInFrames={V4_DURATION}
        fps={V4_FPS}
        width={V4_WIDTH}
        height={V4_HEIGHT}
      />
      <Composition
        id="DonnaDemoV5"
        component={DonnaDemoV5}
        durationInFrames={V5_DURATION}
        fps={V5_FPS}
        width={V5_WIDTH}
        height={V5_HEIGHT}
      />
      <Composition
        id="DonnaDemoV6"
        component={DonnaDemoV6}
        durationInFrames={V6_DURATION}
        fps={V6_FPS}
        width={V6_WIDTH}
        height={V6_HEIGHT}
      />
      <Composition
        id="DonnaDemoV7"
        component={DonnaDemoV7}
        durationInFrames={V7_DURATION}
        fps={V7_FPS}
        width={V7_WIDTH}
        height={V7_HEIGHT}
      />
    </>
  );
};
