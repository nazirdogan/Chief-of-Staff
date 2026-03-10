import React from 'react';
import { AbsoluteFill, Audio, staticFile } from 'remotion';
import { loadFont as loadPlayfair } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';
import { HookScene } from './scenes/HookScene';
import { ProblemScene } from './scenes/ProblemScene';
import { BriefingScene } from './scenes/BriefingScene';
import { ChatScene } from './scenes/ChatScene';
import { AutonomyScene } from './scenes/AutonomyScene';
import { InboxScene } from './scenes/InboxScene';
import { PeopleScene } from './scenes/PeopleScene';
import { TaglineScene } from './scenes/TaglineScene';
import { CTAScene } from './scenes/CTAScene';

// Load all fonts
loadPlayfair();
loadDMSans();
loadJetBrainsMono();

export const DonnaDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#FAF9F6' }}>
      {/* Background music — "Deep Urban" from Mixkit (royalty-free) */}
      <Audio src={staticFile('music.mp3')} volume={0.35} />

      {/* Scene 1: Hook — "What if you never missed a commitment again?" */}
      <HookScene />

      {/* Scene 2: Problem — 847 emails, 12 meetings, 3 promises */}
      <ProblemScene />

      {/* Scene 3: Daily Briefing — The app, morning briefing */}
      <BriefingScene />

      {/* Scene 4: Ask Donna — Chat interface */}
      <ChatScene />

      {/* Scene 5: Graduated Autonomy — One-tap confirmation */}
      <AutonomyScene />

      {/* Scene 6: Unified Inbox — Triaged messages */}
      <InboxScene />

      {/* Scene 7: Relationship Intelligence — People page */}
      <PeopleScene />

      {/* Scene 8: Tagline — "See everything. Miss nothing." */}
      <TaglineScene />

      {/* Scene 9: CTA — Request early access */}
      <CTAScene />
    </AbsoluteFill>
  );
};
