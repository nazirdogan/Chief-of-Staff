'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TextShimmer } from '@/components/ui/text-shimmer';

const THINKING_MESSAGES = [
  'On it.',
  'Reading your context...',
  'Finding what you actually need...',
  'Checking your calendar...',
  'Cutting through the noise...',
  'Almost.',
  'Pulling the threads together...',
  'Cross-referencing your week...',
  'Connecting the dots...',
  'Scanning your inbox...',
  'Looking at what matters...',
  'Give me a second.',
  'Running through the details...',
  'Reading between the lines...',
  'Just a moment.',
  'Digging deeper...',
  'Sorting through the signal...',
  'Getting the full picture...',
  'Thinking this through...',
  'One sec.',
  'Pulling your recent activity...',
  'Looking at the bigger picture...',
  'Cross-checking your commitments...',
  'Filtering the noise...',
  'Almost there.',
  'Seeing who\'s been waiting...',
  'Spotting what slipped through...',
  'Mapping your day...',
  'Reviewing what came in overnight...',
  'Piecing it together...',
  'Working on it.',
  'Prioritising for you...',
  'Checking what actually matters...',
  'Your attention is limited. Mine isn\'t.',
  'Making sure I have this right...',
  'Looking across your whole week...',
  'Checking what you might have missed...',
  'Pulling the full story together...',
  'Thinking ahead...',
  'Tracking down the thread...',
  'Reading your signals...',
  'Lining it all up...',
  'Let me check on that.',
  'Scanning for what matters...',
  'Sorting your priorities...',
  'Running a quick check...',
  'Pulling together what I know...',
  'Getting you what you need...',
  'Sifting through the recent messages...',
  'Nothing gets past me.',
];

const STEP_DURATION_MS = 2500;

function pickNext(current: number): number {
  let next: number;
  do {
    next = Math.floor(Math.random() * THINKING_MESSAGES.length);
  } while (next === current);
  return next;
}

export default function DonnaThinkingIndicator() {
  // Start with a random message instead of always index 0
  const [msgIndex, setMsgIndex] = useState(() =>
    Math.floor(Math.random() * THINKING_MESSAGES.length)
  );
  const msgIndexRef = useRef(msgIndex);
  msgIndexRef.current = msgIndex;

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((current) => pickNext(current));
    }, STEP_DURATION_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="pl-4 py-2"
      style={{ borderLeft: '2px solid rgba(232,132,92,0.25)' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={msgIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <TextShimmer
            className="text-sm font-medium tracking-wide"
            duration={1.8}
            spread={3}
          >
            {THINKING_MESSAGES[msgIndex]}
          </TextShimmer>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
