import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { loadFont as loadPlayfair } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';
import { SCENES, VO } from './constants-v3';
import { IntroScene } from './scenes/v3/IntroScene';
import { BriefingScene } from './scenes/v3/BriefingScene';
import { ChatScene } from './scenes/v3/ChatScene';
import { InboxScene } from './scenes/v3/InboxScene';
import { CommitmentsScene } from './scenes/v3/CommitmentsScene';
import { PeopleScene } from './scenes/v3/PeopleScene';
import { AutonomyScene } from './scenes/v3/AutonomyScene';
import { IntegrationsScene } from './scenes/v3/IntegrationsScene';
import { TaglineScene } from './scenes/v3/TaglineScene';
import { CTAScene } from './scenes/v3/CTAScene';

loadPlayfair();
loadDMSans();
loadJetBrainsMono();

export const DonnaDemoV3: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#FAF9F6' }}>
      {/* Background music — quiet under voiceover */}
      <Audio src={staticFile('music.mp3')} volume={0.12} />

      {/* Voiceover — each placed at the correct absolute frame */}
      <Sequence from={SCENES.intro.start + VO.intro.startInScene}>
        <Audio src={staticFile(VO.intro.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.briefing.start + VO.briefing.startInScene}>
        <Audio src={staticFile(VO.briefing.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.chat.start + VO.chat.startInScene}>
        <Audio src={staticFile(VO.chat.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.inbox.start + VO.inbox.startInScene}>
        <Audio src={staticFile(VO.inbox.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.commitments.start + VO.commitments.startInScene}>
        <Audio src={staticFile(VO.commitments.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.people.start + VO.people.startInScene}>
        <Audio src={staticFile(VO.people.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.autonomy.start + VO.autonomy.startInScene}>
        <Audio src={staticFile(VO.autonomy.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.integrations.start + VO.integrations.startInScene}>
        <Audio src={staticFile(VO.integrations.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.tagline.start + VO.tagline.startInScene}>
        <Audio src={staticFile(VO.tagline.file)} volume={0.85} />
      </Sequence>
      <Sequence from={SCENES.cta.start + VO.cta.startInScene}>
        <Audio src={staticFile(VO.cta.file)} volume={0.85} />
      </Sequence>

      {/* Visual scenes */}
      <IntroScene />
      <BriefingScene />
      <ChatScene />
      <InboxScene />
      <CommitmentsScene />
      <PeopleScene />
      <AutonomyScene />
      <IntegrationsScene />
      <TaglineScene />
      <CTAScene />
    </AbsoluteFill>
  );
};
