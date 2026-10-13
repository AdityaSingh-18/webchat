CREATE TABLE public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  message_id UUID NOT NULL
    REFERENCES public.messages(id)
    ON DELETE CASCADE,

  conversation_id UUID NOT NULL
    REFERENCES public.conversations(id)
    ON DELETE CASCADE,

  uploaded_by UUID NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL
    CHECK (size_bytes >= 0 AND size_bytes <= 104857600),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT message_attachments_file_name_not_empty
    CHECK (LENGTH(TRIM(file_name)) > 0),

  CONSTRAINT message_attachments_storage_path_check
    CHECK (
      storage_path LIKE (conversation_id::TEXT || '/%')
    )
);

CREATE INDEX idx_message_attachments_message_id
  ON public.message_attachments(message_id);

CREATE INDEX idx_message_attachments_conversation_created
  ON public.message_attachments(conversation_id, created_at);

ALTER TABLE public.message_attachments
  ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT
  ON public.message_attachments
  TO authenticated;

CREATE POLICY "Participants can view message attachments"
  ON public.message_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.messages AS m
      WHERE m.id = message_attachments.message_id
        AND m.conversation_id = message_attachments.conversation_id
        AND (
          m.sender_id = (SELECT auth.uid())
          OR m.receiver_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY "Senders can add message attachments"
  ON public.message_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND storage_path LIKE (conversation_id::TEXT || '/%')
    AND EXISTS (
      SELECT 1
      FROM public.messages AS m
      WHERE m.id = message_attachments.message_id
        AND m.conversation_id = message_attachments.conversation_id
        AND m.sender_id = (SELECT auth.uid())
    )
  );
