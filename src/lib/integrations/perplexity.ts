import { env } from '@/lib/config';

export interface PerplexitySearchResult {
  answer: string;
  citations: Array<{ url: string; title?: string; excerpt?: string }>;
  model_used: string;
}

/**
 * Quick web search using Perplexity Sonar.
 * Cost: ~$0.008/query
 */
export async function quickSearch(query: string): Promise<PerplexitySearchResult> {
  return callPerplexity(query, 'sonar');
}

/**
 * Deep web search using Perplexity Sonar Pro.
 * Cost: ~$0.03/query
 */
export async function deepSearch(query: string): Promise<PerplexitySearchResult> {
  return callPerplexity(query, 'sonar-pro');
}

/**
 * Deep research using Perplexity Sonar Deep Research.
 * Cost: ~$0.15-0.30/query
 */
export async function deepResearch(query: string): Promise<PerplexitySearchResult> {
  return callPerplexity(query, 'sonar-deep-research');
}

async function callPerplexity(query: string, model: string): Promise<PerplexitySearchResult> {
  const apiKey = env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not configured');
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'Be precise and concise. Provide factual information with source citations.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
      max_tokens: model === 'sonar-deep-research' ? 4096 : 2048,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Perplexity API error (${response.status}): ${text}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    citations?: Array<string | { url: string; title?: string }>;
  };
  const content = data.choices?.[0]?.message?.content ?? '';
  const citations = (data.citations ?? []).map((c) => {
    if (typeof c === 'string') return { url: c };
    return c;
  });

  return {
    answer: content,
    citations,
    model_used: model,
  };
}
