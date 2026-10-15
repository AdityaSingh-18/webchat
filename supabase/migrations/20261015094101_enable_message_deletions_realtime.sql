GRANT SELECT ON TABLE public.message_user_deletions TO authenticated;

ALTER TABLE public.message_user_deletions
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
  "Users can view their own message deletions for realtime"
ON public.message_user_deletions;

CREATE POLICY
  "Users can view their own message deletions for realtime"
ON public.message_user_deletions
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'message_user_deletions'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.message_user_deletions;
  END IF;
END
$$;