import { createServiceClient } from '@/lib/db/client';
import { AI_MODELS } from '@/lib/ai/models';
import Anthropic from '@anthropic-ai/sdk';

export interface ReportResult {
  id: string;
  type: 'weekly_summary' | 'project_status' | 'ad_hoc_research';
  title: string;
  content: string;
  generated_at: string;
  sections: Array<{ heading: string; body: string }>;
}

/**
 * Generate a weekly summary report covering the past 7 days.
 */
export async function generateWeeklySummary(userId: string): Promise<ReportResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Gather data from the past week
  const [tasksResult, inboxResult, briefingsResult, contactsResult] = await Promise.all([
    db.from('tasks').select('task_text, status, direction, created_at, resolved_at')
      .eq('user_id', userId).gte('created_at', sevenDaysAgo),
    db.from('inbox_items').select('subject, from_name, from_email, ai_summary, received_at, reply_drafted')
      .eq('user_id', userId).gte('received_at', sevenDaysAgo).limit(50),
    db.from('briefings').select('generated_at, items:briefing_items(title, category)')
      .eq('user_id', userId).gte('generated_at', sevenDaysAgo),
    db.from('contacts').select('name, email, relationship_score, last_interaction_at')
      .eq('user_id', userId).order('last_interaction_at', { ascending: false }).limit(20),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks = (tasksResult.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inbox = (inboxResult.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const briefings = (briefingsResult.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contacts = (contactsResult.data ?? []) as any[];

  const contextText = [
    `## Tasks This Week`,
    `- New tasks: ${tasks.length}`,
    `- Resolved: ${tasks.filter((t) => t.status === 'resolved').length}`,
    `- Open: ${tasks.filter((t) => t.status === 'open').length}`,
    tasks.slice(0, 10).map((t) => `  - ${t.task_text} (${t.status})`).join('\n'),
    '',
    `## Email Activity`,
    `- Emails received: ${inbox.length}`,
    `- Replies drafted: ${inbox.filter((i) => i.reply_drafted).length}`,
    inbox.slice(0, 10).map((i) => `  - ${i.subject || '(no subject)'} from ${i.from_name || i.from_email}`).join('\n'),
    '',
    `## Top Contacts`,
    contacts.slice(0, 10).map((c) => `  - ${c.name || c.email} (score: ${c.relationship_score})`).join('\n'),
    '',
    `## Briefings Generated: ${briefings.length}`,
  ].join('\n');

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: AI_MODELS.STANDARD,
    max_tokens: 2048,
    system: `You are Donna, an AI chief of staff. Generate a weekly summary report for the user.
Be concise, insightful, and action-oriented. Highlight:
1. Key accomplishments (tasks resolved)
2. Pending items needing attention
3. Relationship health (who they've been active with, who they haven't)
4. Patterns or concerns
Format as clear sections with headers. No fluff.`,
    messages: [{ role: 'user', content: `Generate a weekly summary based on this data from the past 7 days:\n\n${contextText}` }],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  const reportContent = textContent?.type === 'text' ? textContent.text : 'Unable to generate report.';

  // Parse sections from the markdown
  const sections = parseSections(reportContent);

  // Store the report
  const { data: report } = await db
    .from('reports')
    .insert({
      user_id: userId,
      type: 'weekly_summary',
      title: `Weekly Summary — ${new Date().toLocaleDateString()}`,
      content: reportContent,
      sections,
    })
    .select('id, created_at')
    .single();

  return {
    id: report?.id ?? crypto.randomUUID(),
    type: 'weekly_summary',
    title: `Weekly Summary — ${new Date().toLocaleDateString()}`,
    content: reportContent,
    generated_at: report?.created_at ?? new Date().toISOString(),
    sections,
  };
}

/**
 * Generate a project status report.
 */
export async function generateProjectStatus(userId: string, project: string): Promise<ReportResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;

  // Get project-related context chunks
  const { data: chunks } = await db
    .from('context_chunks')
    .select('title, content_summary, provider, occurred_at, people')
    .eq('user_id', userId)
    .contains('projects', [project])
    .order('occurred_at', { ascending: false })
    .limit(30);

  const { data: tasks } = await db
    .from('tasks')
    .select('task_text, status, direction, recipient_name')
    .eq('user_id', userId)
    .eq('status', 'open');

  const contextText = [
    `## Project: ${project}`,
    '',
    `## Related Activity (${(chunks ?? []).length} items)`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(chunks ?? []).slice(0, 20).map((c: any) => `- [${c.provider}] ${c.title}: ${c.content_summary?.substring(0, 100)}`),
    '',
    `## Open Tasks`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(tasks ?? []).slice(0, 15).map((t: any) => `- ${t.task_text} (${t.direction} — ${t.recipient_name || 'unknown'})`),
  ].join('\n');

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: AI_MODELS.STANDARD,
    max_tokens: 2048,
    system: `You are Donna, an AI chief of staff. Generate a project status report.
Include: current status, key activities, blockers, next steps, and people involved.
Be structured and actionable.`,
    messages: [{ role: 'user', content: `Generate a project status report:\n\n${contextText}` }],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  const reportContent = textContent?.type === 'text' ? textContent.text : 'Unable to generate report.';
  const sections = parseSections(reportContent);

  const { data: report } = await db
    .from('reports')
    .insert({
      user_id: userId,
      type: 'project_status',
      title: `Project Status: ${project}`,
      content: reportContent,
      sections,
    })
    .select('id, created_at')
    .single();

  return {
    id: report?.id ?? crypto.randomUUID(),
    type: 'project_status',
    title: `Project Status: ${project}`,
    content: reportContent,
    generated_at: report?.created_at ?? new Date().toISOString(),
    sections,
  };
}

/**
 * Generate ad-hoc research report. Pro tier only — uses Opus for complex analysis.
 */
export async function generateAdHocResearch(userId: string, topic: string): Promise<ReportResult> {
  // Use Perplexity for web research first
  let webContext = '';
  try {
    const { deepResearch } = await import('@/lib/integrations/perplexity');
    const searchResult = await deepResearch(topic);
    webContext = `## Web Research\n${searchResult.answer}\n\nSources:\n${searchResult.citations.map((c) => `- ${c.url}${c.title ? ` (${c.title})` : ''}`).join('\n')}`;
  } catch {
    webContext = '## Web Research\nUnable to perform web research.';
  }

  // Also check internal context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;
  const { data: chunks } = await db
    .from('context_chunks')
    .select('title, content_summary, provider')
    .eq('user_id', userId)
    .textSearch('content_summary', topic.split(' ').join(' & '))
    .limit(15);

  const internalContext = (chunks ?? []).length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? `## Internal Context\n${(chunks ?? []).map((c: any) => `- [${c.provider}] ${c.title}: ${c.content_summary?.substring(0, 150)}`).join('\n')}`
    : '';

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: AI_MODELS.POWERFUL,
    max_tokens: 4096,
    system: `You are Donna, an AI chief of staff conducting deep research for the user.
Synthesize web research and internal context into a comprehensive, well-structured report.
Include: executive summary, key findings, analysis, recommendations, and sources.
Be thorough but concise. Always cite sources.`,
    messages: [{ role: 'user', content: `Research topic: ${topic}\n\n${webContext}\n\n${internalContext}` }],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  const reportContent = textContent?.type === 'text' ? textContent.text : 'Unable to generate report.';
  const sections = parseSections(reportContent);

  const { data: report } = await db
    .from('reports')
    .insert({
      user_id: userId,
      type: 'ad_hoc_research',
      title: `Research: ${topic}`,
      content: reportContent,
      sections,
    })
    .select('id, created_at')
    .single();

  return {
    id: report?.id ?? crypto.randomUUID(),
    type: 'ad_hoc_research',
    title: `Research: ${topic}`,
    content: reportContent,
    generated_at: report?.created_at ?? new Date().toISOString(),
    sections,
  };
}

function parseSections(markdown: string): Array<{ heading: string; body: string }> {
  const sections: Array<{ heading: string; body: string }> = [];
  const lines = markdown.split('\n');
  let currentHeading = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      if (currentHeading || currentBody.length > 0) {
        sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() });
      }
      currentHeading = headingMatch[1];
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  if (currentHeading || currentBody.length > 0) {
    sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() });
  }

  return sections;
}
