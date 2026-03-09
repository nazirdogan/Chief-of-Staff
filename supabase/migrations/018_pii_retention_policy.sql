-- PII Data Retention Policy
-- Activity sessions retained for 90 days, narratives for 365 days

CREATE OR REPLACE FUNCTION public.cleanup_old_activity_sessions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.activity_sessions WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM public.app_transitions WHERE transitioned_at < NOW() - INTERVAL '90 days';
  DELETE FROM public.day_narratives WHERE created_at < NOW() - INTERVAL '365 days';
END;
$$;

-- Indexes for efficient range deletes
CREATE INDEX IF NOT EXISTS idx_activity_sessions_created_at ON public.activity_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_app_transitions_created_at ON public.app_transitions(transitioned_at);
CREATE INDEX IF NOT EXISTS idx_day_narratives_created_at ON public.day_narratives(created_at);
