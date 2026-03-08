'use client';

import { useState } from 'react';

const c = {
  surface: 'rgba(255,255,255,0.04)',
  surfaceElevated: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  borderActive: 'rgba(232,132,92,0.25)',
  dawn: '#E8845C',
  dawnLight: '#F09D7A',
  dawnMuted: 'rgba(232,132,92,0.15)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
  textGhost: 'rgba(255,255,255,0.2)',
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
