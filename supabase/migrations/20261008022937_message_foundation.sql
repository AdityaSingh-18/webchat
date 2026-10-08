BEGIN;

UPDATE public.messages
SET is_read = false
WHERE is_read IS NULL;

UPDATE public.messages
SET created_at = now()
WHERE created_at IS NULL;

ALTER TABLE public.messages
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.messages
ALTER COLUMN sender_id SET NOT NULL;

ALTER TABLE public.messages
ALTER COLUMN receiver_id SET NOT NULL;

ALTER TABLE public.messages
ALTER COLUMN content SET NOT NULL;

ALTER TABLE public.messages
ALTER COLUMN is_read SET DEFAULT false;

ALTER TABLE public.messages
ALTER COLUMN is_read SET NOT NULL;

ALTER TABLE public.messages
ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.messages
ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'messages_sender_id_fkey'
    ) THEN
        ALTER TABLE public.messages
        ADD CONSTRAINT messages_sender_id_fkey
        FOREIGN KEY (sender_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'messages_receiver_id_fkey'
    ) THEN
        ALTER TABLE public.messages
        ADD CONSTRAINT messages_receiver_id_fkey
        FOREIGN KEY (receiver_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'messages_sender_receiver_different'
    ) THEN
        ALTER TABLE public.messages
        ADD CONSTRAINT messages_sender_receiver_different
        CHECK (sender_id <> receiver_id);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS messages_sender_receiver_created_at_idx
ON public.messages (sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_receiver_sender_created_at_idx
ON public.messages (receiver_id, sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_receiver_unread_idx
ON public.messages (receiver_id, created_at DESC)
WHERE is_read = false;

CREATE INDEX IF NOT EXISTS connections_user_contact_status_idx
ON public.connections (user_id, contact_id, status);

CREATE INDEX IF NOT EXISTS connections_contact_user_status_idx
ON public.connections (contact_id, user_id, status);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_select_participant
ON public.messages;

CREATE POLICY messages_select_participant
ON public.messages
FOR SELECT
TO authenticated
USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
);

DROP POLICY IF EXISTS messages_insert_connected_sender
ON public.messages;

CREATE POLICY messages_insert_connected_sender
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
        SELECT 1
        FROM public.connections c
        WHERE c.status = 'accepted'
        AND (
            (
                c.user_id = auth.uid()
                AND c.contact_id = receiver_id
            )
            OR
            (
                c.user_id = receiver_id
                AND c.contact_id = auth.uid()
            )
        )
    )
);

COMMIT;