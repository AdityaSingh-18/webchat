-- 1. Add delivery and read receipt timestamps.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- 2. Optimize unread message lookups.
CREATE INDEX IF NOT EXISTS messages_unread_receiver_idx
  ON public.messages (receiver_id, conversation_id)
  WHERE is_read = false;

-- 3. Remove policies that bypass the connection check
-- or allow participants to update entire message rows.
DROP POLICY IF EXISTS "Users can insert their own messages"
  ON public.messages;

DROP POLICY IF EXISTS "Users can update their relevant messages"
  ON public.messages;

-- 4. Remove direct UPDATE access from regular client roles.
-- The receipt functions below will perform the authorized updates.
REVOKE UPDATE ON TABLE public.messages
  FROM PUBLIC, anon, authenticated;

-- Also revoke any separately granted column-level UPDATE privileges.
REVOKE UPDATE (
  id,
  conversation_id,
  sender_id,
  receiver_id,
  content,
  is_read,
  created_at,
  delivered_at,
  read_at
)
ON TABLE public.messages
FROM PUBLIC, anon, authenticated;

-- 5. Mark a message as delivered.
-- Only its intended recipient can perform this operation.
CREATE OR REPLACE FUNCTION public.mark_message_delivered(
  p_message_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rows_updated integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.messages AS m
  SET delivered_at = statement_timestamp()
  WHERE m.id = p_message_id
    AND m.receiver_id = auth.uid()
    AND m.delivered_at IS NULL;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN rows_updated > 0;
END;
$$;

-- 6. Mark a message as read.
-- This also ensures that its delivery timestamp is populated.
CREATE OR REPLACE FUNCTION public.mark_message_read(
  p_message_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rows_updated integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.messages AS m
  SET
    delivered_at = COALESCE(
      m.delivered_at,
      statement_timestamp()
    ),
    read_at = COALESCE(
      m.read_at,
      statement_timestamp()
    ),
    is_read = true
  WHERE m.id = p_message_id
    AND m.receiver_id = auth.uid()
    AND (
      m.is_read IS DISTINCT FROM true
      OR m.read_at IS NULL
      OR m.delivered_at IS NULL
    );

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN rows_updated > 0;
END;
$$;

-- 7. Restrict RPC execution to authenticated users.
REVOKE ALL ON FUNCTION public.mark_message_delivered(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.mark_message_read(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mark_message_delivered(uuid)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.mark_message_read(uuid)
  TO authenticated;