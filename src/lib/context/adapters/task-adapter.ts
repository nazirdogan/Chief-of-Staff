import type { ContextAdapter, ContextPipelineInput } from '@/lib/context/types';

interface TaskData {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeEmail?: string;
  assigneeName?: string;
  reporterEmail?: string;
  projectName?: string;
  dueDate?: string;
  updatedAt?: string;
  provider: string;
}

export const taskAdapter: ContextAdapter = {
  toContextInput(rawData: unknown): ContextPipelineInput[] {
    const tasks = Array.isArray(rawData) ? rawData : [rawData];

    return tasks
      .filter((t): t is TaskData => !!t && typeof t === 'object' && 'id' in t)
      .map((task) => {
        const people: string[] = [];
        if (task.assigneeEmail) people.push(task.assigneeEmail);
        if (task.reporterEmail) people.push(task.reporterEmail);

        const taskName = task.name || task.title || 'Untitled task';
        const parts: string[] = [`Task: ${taskName}`];
        if (task.projectName) parts.push(`Project: ${task.projectName}`);
        if (task.status) parts.push(`Status: ${task.status}`);
        if (task.priority) parts.push(`Priority: ${task.priority}`);
        if (task.dueDate) parts.push(`Due: ${task.dueDate}`);
        if (task.description) parts.push(task.description.slice(0, 500));

        return {
          sourceId: task.id,
          sourceRef: {
            provider: task.provider,
            task_id: task.id,
            title: taskName,
            project: task.projectName,
          },
          title: taskName,
          rawContent: parts.join('\n'),
          occurredAt: task.updatedAt
            ? new Date(task.updatedAt).toISOString()
            : new Date().toISOString(),
          people,
          chunkType: 'task_update',
        };
      });
  },
};
