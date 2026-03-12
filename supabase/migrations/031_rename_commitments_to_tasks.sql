-- Migration 031: Rename commitments to tasks
-- Part of the Donna Assistant Evolution — Session 1

-- Rename the table
ALTER TABLE commitments RENAME TO tasks;

-- Rename the commitment_text column to task_text
ALTER TABLE tasks RENAME COLUMN commitment_text TO task_text;

-- Add direction column for inbound request detection
ALTER TABLE tasks ADD COLUMN direction TEXT NOT NULL DEFAULT 'outbound'
  CHECK (direction IN ('outbound', 'inbound'));

-- Rename indexes (PostgreSQL carries them along with the table, but
-- the names still reference "commitments" — rename for clarity)
ALTER INDEX IF EXISTS commitments_pkey RENAME TO tasks_pkey;
ALTER INDEX IF EXISTS commitments_user_id_status_idx RENAME TO tasks_user_id_status_idx;
ALTER INDEX IF EXISTS commitments_user_id_created_at_idx RENAME TO tasks_user_id_created_at_idx;

-- Update RLS policies: drop old, create new with updated names
-- (Policy names reference the old table name and must be recreated)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'tasks'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON tasks', pol.policyname);
  END LOOP;
END $$;

-- Recreate RLS policies for tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Service role policy for backend operations
CREATE POLICY "Service role full access to tasks"
  ON tasks FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Rename open_commitments_count to open_tasks_count on contacts
ALTER TABLE contacts RENAME COLUMN open_commitments_count TO open_tasks_count;

-- Rename commitment_check_enabled to task_check_enabled on heartbeat_config
ALTER TABLE heartbeat_config RENAME COLUMN commitment_check_enabled TO task_check_enabled;

-- Update commitment_stats to task_stats in reflections (JSONB column — no rename needed,
-- but the app code will write task_stats going forward. Old data keeps commitment_stats key.)
