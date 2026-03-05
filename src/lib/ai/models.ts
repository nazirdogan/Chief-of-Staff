export const AI_MODELS = {
  FAST: 'claude-haiku-4-5-20251001',
  STANDARD: 'claude-sonnet-4-6',
  POWERFUL: 'claude-opus-4-6',
} as const;

export type AIModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];
