CREATE TABLE IF NOT EXISTS public.starred_messages (
  user_id UUID NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  message_id UUID NOT NULL
    REFERENCES public.messages(id)
    ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT starred_messages_pkey
    PRIMARY KEY (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS starred_messages_user_created_idx
  ON public.starred_messages (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS starred_messages_message_idx
  ON public.starred_messages (message_id);

ALTER TABLE public.starred_messages
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.starred_messages
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, DELETE
  ON TABLE public.starred_messages
  TO authenticated;

DROP POLICY IF EXISTS "Users can view their own starred messages"
  ON public.starred_messages;

CREATE POLICY "Users can view their own starred messages"
  ON public.starred_messages
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can star messages they participate in"
  ON public.starred_messages;

CREATE POLICY "Users can star messages they participate in"
  ON public.starred_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.messages AS m
      WHERE m.id = message_id
        AND (
          m.sender_id = (SELECT auth.uid())
          OR m.receiver_id = (SELECT auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Users can unstar their own messages"
  ON public.starred_messages;

CREATE POLICY "Users can unstar their own messages"
  ON public.starred_messages
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );
