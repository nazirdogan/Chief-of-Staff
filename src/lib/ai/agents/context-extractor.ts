import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent, buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import { buildContextExtractionPrompt } from '@/lib/ai/prompts/context-extraction';
import { generateEmbedding } from '@/lib/ai/embeddings';
import type {
  ContextPipelineInput,
  ContextExtractionResult,
  ContextImportance,
} from '@/lib/context/types';

const anthropic = new Anthropic();

function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function computeExpiresAt(importance: ContextImportance): string | null {
  const now = new Date();
  switch (importance) {
    case 'critical':
      return null; // never expires
    case 'important': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString();
    }
    case 'background': {
      const d = new Date(now);
      d.setDate(d.getDate() + 90);
      return d.toISOString();
    }
    case 'noise': {
      const d = new Date(now);
      d.setDate(d.getDate() + 14);
      return d.toISOString();
    }
  }
}

function parseExtractionResult(text: string): ContextExtractionResult {
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      content_summary: parsed.content_summary || 'No summary available.',
      entities: parsed.entities || {},
      sentiment: parsed.sentiment || 'neutral',
      importance: parsed.importance || 'background',
      importance_score: Math.min(10, Math.max(1, parsed.importance_score || 5)),
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      people: Array.isArray(parsed.people) ? parsed.people : [],
    };
  } catch (err) {
    console.warn(
      '[context-extractor] Failed to parse AI extraction result:',
      err instanceof Error ? err.message : 'unknown',
      '| Raw response:',
      text.slice(0, 200),
    );
    return {
      content_summary: 'Failed to extract context.',
      entities: {},
      sentiment: 'neutral',
      importance: 'background',
      importance_score: 3,
      topics: [],
      projects: [],
      people: [],
    };
  }
}

/** Fallback extraction when the AI call fails entirely */
function fallbackExtraction(item: ContextPipelineInput): ContextExtractionResult {
  // Use a truncated version of the raw content as the summary
  const summary = item.rawContent.length > 200
    ? item.rawContent.slice(0, 200) + '...'
    : item.rawContent;

  return {
    content_summary: summary || 'Content captured but extraction unavailable.',
    entities: {},
    sentiment: 'neutral',
    importance: 'background',
    importance_score: 3,
    topics: [],
    projects: [],
    people: item.people ?? [],
  };
}

export async function extractContext(
  item: ContextPipelineInput,
  provider: string,
  activeProjects: string[],
  vipContacts: string[]
): Promise<{
  extraction: ContextExtractionResult;
  embedding: number[];
  contentHash: string;
  expiresAt: string | null;
}> {
  const { content: safeContent } = sanitiseContent(
    item.rawContent,
    `${provider}:${item.sourceId}`
  );

  let extraction: ContextExtractionResult;

  try {
    const prompt = buildContextExtractionPrompt(activeProjects, vipContacts);
    const context = buildSafeAIContext(prompt, [
      {
        label: item.chunkType,
        content: `${item.title ? `Title: ${item.title}\n` : ''}${safeContent}`,
        source: `${provider}:${item.sourceId}`,
      },
    ]);

    const response = await anthropic.messages.create({
      model: AI_MODELS.FAST,
      max_tokens: 500,
      messages: [{ role: 'user', content: context }],
    });

    const textBlock = response.content.find((c) => c.type === 'text');
    extraction = parseExtractionResult(
      textBlock && textBlock.type === 'text' ? textBlock.text : ''
    );
  } catch (err) {
    console.error(
      '[context-extractor] AI extraction failed, using fallback:',
      err instanceof Error ? err.message : 'unknown',
      `| provider=${provider}, sourceId=${item.sourceId}`,
    );
    extraction = fallbackExtraction(item);
  }

  // Merge people from input with extracted people
  if (item.people) {
    for (const p of item.people) {
      if (!extraction.people.includes(p)) {
        extraction.people.push(p);
      }
    }
  }

  const contentHash = computeContentHash(item.rawContent);
  const embedding = await generateEmbedding(extraction.content_summary);
  const expiresAt = computeExpiresAt(extraction.importance);

  return { extraction, embedding, contentHash, expiresAt };
}
