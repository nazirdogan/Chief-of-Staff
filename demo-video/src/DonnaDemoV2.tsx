import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { loadFont as loadPlayfair } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';
import { SCENES, VO } from './constants-v2';
import { WakeupScene } from './scenes/v2/WakeupScene';
import { BriefingSceneV2 } from './scenes/v2/BriefingSceneV2';
import { AskSceneV2 } from './scenes/v2/AskSceneV2';
import { ActionSceneV2 } from './scenes/v2/ActionSceneV2';
import { SplitScene } from './scenes/v2/SplitScene';
import { TaglineSceneV2 } from './scenes/v2/TaglineSceneV2';
import { CTASceneV2 } from './scenes/v2/CTASceneV2';

loadPlayfair();
loadDMSans();
loadJetBrainsMono();

export const DonnaDemoV2: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#FAF9F6' }}>
      {/* Background music — quiet under voiceover */}
      <Audio src={staticFile('music.mp3')} volume={0.12} />

      {/* Voiceover — each placed at the correct absolute frame */}
      <Sequence from={SCENES.wakeup.start + VO.wakeup.startInScene}>
        <Audio src={staticFile(VO.wakeup.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.briefing.start + VO.briefing.startInScene}>
        <Audio src={staticFile(VO.briefing.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.ask.start + VO.ask.startInScene}>
        <Audio src={staticFile(VO.ask.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.action.start + VO.action.startInScene}>
        <Audio src={staticFile(VO.action.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.split.start + VO.split.startInScene}>
        <Audio src={staticFile(VO.split.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.tagline.start + VO.tagline.startInScene}>
        <Audio src={staticFile(VO.tagline.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.cta.start + VO.cta.startInScene}>
        <Audio src={staticFile(VO.cta.file)} volume={0.85} />
      </Sequence>

      {/* Visual scenes */}
      <WakeupScene />
      <BriefingSceneV2 />
      <AskSceneV2 />
      <ActionSceneV2 />
      <SplitScene />
      <TaglineSceneV2 />
      <CTASceneV2 />
    </AbsoluteFill>
  );
};
