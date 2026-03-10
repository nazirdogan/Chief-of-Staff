'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TextShimmer } from '@/components/ui/text-shimmer';

const THINKING_STEPS = [
  'On it.',
  'Reading your context...',
  'Finding what you actually need...',
  'Checking your calendar...',
  'Cutting through the noise...',
  'Almost.',
];

const STEP_DURATION_MS = 2500;

export default function DonnaThinkingIndicator() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % THINKING_STEPS.length);
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
          key={stepIndex}
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
            {THINKING_STEPS[stepIndex]}
          </TextShimmer>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
