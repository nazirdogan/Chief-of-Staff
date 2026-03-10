-- Wipe all existing reflections — they were duplicated due to missing dedup logic.
-- Clean reflections will be generated on the correct schedule going forward.
DELETE FROM public.reflections;

-- Prevent duplicate reflections for the same user, type, and period.
ALTER TABLE public.reflections
  ADD CONSTRAINT uq_reflections_user_type_period
  UNIQUE (user_id, reflection_type, period_start, period_end);
