'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

interface ProjectSetupData {
  projects: string[];
  weeklyPriority: string;
}

interface ProjectSetupStepProps {
  initialData: ProjectSetupData;
  onNext: (data: ProjectSetupData) => void;
  onBack: () => void;
}

export function ProjectSetupStep({
  initialData,
  onNext,
  onBack,
}: ProjectSetupStepProps) {
  const [projects, setProjects] = useState<string[]>(
    initialData.projects.length > 0 ? initialData.projects : ['']
  );
  const [weeklyPriority, setWeeklyPriority] = useState(
    initialData.weeklyPriority
  );

  function addProject() {
    if (projects.length >= 10) return;
    setProjects([...projects, '']);
  }

  function removeProject(index: number) {
    setProjects(projects.filter((_, i) => i !== index));
  }

  function updateProject(index: number, value: string) {
    const updated = [...projects];
    updated[index] = value;
    setProjects(updated);
  }

  function handleNext() {
    const validProjects = projects.filter((p) => p.trim() !== '');
    onNext({ projects: validProjects, weeklyPriority: weeklyPriority.trim() });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">What are you working on?</h2>
        <p className="text-sm text-muted-foreground">
          List your active projects so Donna can prioritise related
          messages and tasks.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Active projects</Label>
        {projects.map((project, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="e.g. Q1 Product Launch"
              value={project}
              onChange={(e) => updateProject(index, e.target.value)}
            />
            {projects.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeProject(index)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {projects.length < 10 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addProject}
          >
            Add another project
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="weekly-priority" className="text-sm font-medium">
          What is your biggest priority this week?
        </Label>
        <Textarea
          id="weekly-priority"
          placeholder="e.g. Close the partnership deal with Acme Corp by Friday"
          value={weeklyPriority}
          onChange={(e) => setWeeklyPriority(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>Next</Button>
      </div>
    </div>
  );
}
