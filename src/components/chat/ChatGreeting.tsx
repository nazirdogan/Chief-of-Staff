'use client';

import { useState } from 'react';

const c = {
  surface: 'rgba(45,45,45,0.04)',
  surfaceElevated: 'rgba(45,45,45,0.06)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  borderActive: 'rgba(232,132,92,0.35)',
  dawn: '#E8845C',
  dawnLight: '#F09D7A',
  dawnMuted: 'rgba(232,132,92,0.15)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
};

const quickActions = [
  'Prep me for my next meeting',
  'What did I miss yesterday?',
  "Who's waiting on me?",
  'What are my open commitments?',
  'How was my week?',
];

interface ChatGreetingProps {
  onSelectPrompt: (prompt: string) => void;
}

export default function ChatGreeting({ onSelectPrompt }: ChatGreetingProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="flex max-w-lg flex-col items-center text-center">
        <h2
          className="text-[20px] font-semibold"
          style={{ color: c.text }}
        >
          What can I help you with?
        </h2>
        <p
          className="mt-2 text-[15px] leading-relaxed"
          style={{ color: c.textTertiary }}
        >
          I have access to your emails, calendar, tasks, and everything
          connected to Donna.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {quickActions.map((prompt, index) => (
            <button
              key={prompt}
              onClick={() => onSelectPrompt(prompt)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer rounded-lg px-4 py-2.5 text-[13px] transition-colors"
              style={{
                background:
                  hoveredIndex === index ? c.surfaceElevated : c.surface,
                border: `1px solid ${hoveredIndex === index ? c.borderHover : c.border}`,
                color: c.textSecondary,
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
