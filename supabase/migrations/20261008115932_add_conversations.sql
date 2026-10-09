BEGIN;

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_one_id UUID NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  user_two_id UUID NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT conversations_different_users
    CHECK (user_one_id <> user_two_id),

  CONSTRAINT conversations_user_order
    CHECK (user_one_id < user_two_id),

  CONSTRAINT conversations_unique_users
    UNIQUE (user_one_id, user_two_id)
);

CREATE INDEX IF NOT EXISTS conversations_user_one_idx
ON public.conversations (user_one_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS conversations_user_two_idx
ON public.conversations (user_two_id, updated_at DESC);

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS conversation_id UUID;

INSERT INTO public.conversations (
  user_one_id,
  user_two_id
)
SELECT DISTINCT
  CASE
    WHEN sender_id < receiver_id THEN sender_id
    ELSE receiver_id
  END,
  CASE
    WHEN sender_id < receiver_id THEN receiver_id
    ELSE sender_id
  END
FROM public.messages
WHERE sender_id <> receiver_id
ON CONFLICT (user_one_id, user_two_id) DO NOTHING;

UPDATE public.messages m
SET conversation_id = c.id
FROM public.conversations c
WHERE m.conversation_id IS NULL
  AND c.user_one_id = LEAST(m.sender_id, m.receiver_id)
  AND c.user_two_id = GREATEST(m.sender_id, m.receiver_id);

ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

ALTER TABLE public.messages
ADD CONSTRAINT messages_conversation_id_fkey
FOREIGN KEY (conversation_id)
REFERENCES public.conversations(id)
ON DELETE CASCADE;

ALTER TABLE public.messages
ALTER COLUMN conversation_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS messages_conversation_created_at_idx
ON public.messages (conversation_id, created_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversations_select_participant
ON public.conversations;

CREATE POLICY conversations_select_participant
ON public.conversations
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_one_id
  OR auth.uid() = user_two_id
);

DROP POLICY IF EXISTS conversations_insert_participant
ON public.conversations;

CREATE POLICY conversations_insert_participant
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  (
    auth.uid() = user_one_id
    OR auth.uid() = user_two_id
  )
  AND EXISTS (
    SELECT 1
    FROM public.connections c
    WHERE c.status = 'accepted'
      AND (
        (
          c.user_id = user_one_id
          AND c.contact_id = user_two_id
        )
        OR
        (
          c.user_id = user_two_id
          AND c.contact_id = user_one_id
        )
      )
  )
);

DROP POLICY IF EXISTS conversations_update_participant
ON public.conversations;

CREATE POLICY conversations_update_participant
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_one_id
  OR auth.uid() = user_two_id
)
WITH CHECK (
  auth.uid() = user_one_id
  OR auth.uid() = user_two_id
);

DROP POLICY IF EXISTS conversations_delete_participant
ON public.conversations;

CREATE POLICY conversations_delete_participant
ON public.conversations
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_one_id
  OR auth.uid() = user_two_id
);

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_update_conversation_timestamp
ON public.messages;

CREATE TRIGGER messages_update_conversation_timestamp
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

COMMIT;