import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { loadFont as loadPlayfair } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';
import { SCENES, VO } from './constants-v7';
import { IntroScene } from './scenes/v7/IntroScene';
import { BriefingScene } from './scenes/v7/BriefingScene';
import { ChatScene } from './scenes/v7/ChatScene';
import { MontageScene } from './scenes/v7/MontageScene';
import { AutonomyScene } from './scenes/v7/AutonomyScene';
import { TaglineScene } from './scenes/v7/TaglineScene';
import { CTAScene } from './scenes/v7/CTAScene';

loadPlayfair();
loadDMSans();
loadJetBrainsMono();

export const DonnaDemoV7: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#FAF9F6' }}>
      <Audio src={staticFile('music.mp3')} volume={0.12} />

      <Sequence from={SCENES.intro.start + VO.intro.startInScene}>
        <Audio src={staticFile(VO.intro.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.briefing.start + VO.briefing.startInScene}>
        <Audio src={staticFile(VO.briefing.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.chat.start + VO.chat.startInScene}>
        <Audio src={staticFile(VO.chat.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.montage.start + VO.montage.startInScene}>
        <Audio src={staticFile(VO.montage.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.autonomy.start + VO.autonomy.startInScene}>
        <Audio src={staticFile(VO.autonomy.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.tagline.start + VO.tagline.startInScene}>
        <Audio src={staticFile(VO.tagline.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.cta.start + VO.cta.startInScene}>
        <Audio src={staticFile(VO.cta.file)} volume={0.85} />
      </Sequence>

      <IntroScene />
      <BriefingScene />
      <ChatScene />
      <MontageScene />
      <AutonomyScene />
      <TaglineScene />
      <CTAScene />
    </AbsoluteFill>
  );
};
