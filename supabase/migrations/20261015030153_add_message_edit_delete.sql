ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_for_everyone_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.message_user_deletions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS message_user_deletions_conversation_idx
ON public.message_user_deletions (user_id, conversation_id);

ALTER TABLE public.message_user_deletions
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their message deletions"
ON public.message_user_deletions;

CREATE POLICY "Users can view their message deletions"
ON public.message_user_deletions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can hide messages in their conversations"
ON public.message_user_deletions;

CREATE POLICY "Users can hide messages in their conversations"
ON public.message_user_deletions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.messages AS m
    WHERE m.id = message_id
      AND m.conversation_id = conversation_id
      AND (
        m.sender_id = auth.uid()
        OR m.receiver_id = auth.uid()
      )
  )
);

GRANT SELECT, INSERT
ON public.message_user_deletions
TO authenticated;