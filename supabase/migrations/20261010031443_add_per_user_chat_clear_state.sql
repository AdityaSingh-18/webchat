CREATE TABLE IF NOT EXISTS public.conversation_user_state (
  conversation_id uuid NOT NULL
    REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  cleared_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversation_user_state
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own conversation clear state"
  ON public.conversation_user_state;

CREATE POLICY "Users can read their own conversation clear state"
  ON public.conversation_user_state
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL PRIVILEGES ON TABLE public.conversation_user_state
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.conversation_user_state
  TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_my_conversation(
  p_other_user_id uuid
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
  v_cleared_at timestamptz := statement_timestamp();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF p_other_user_id IS NULL
     OR p_other_user_id = v_user_id THEN
    RAISE EXCEPTION 'Invalid conversation participant'
      USING ERRCODE = '22023';
  END IF;

  SELECT c.id
  INTO v_conversation_id
  FROM public.conversations AS c
  WHERE c.user_one_id = LEAST(v_user_id, p_other_user_id)
    AND c.user_two_id = GREATEST(v_user_id, p_other_user_id)
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.conversation_user_state (
    conversation_id,
    user_id,
    cleared_at
  )
  VALUES (
    v_conversation_id,
    v_user_id,
    v_cleared_at
  )
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET cleared_at = EXCLUDED.cleared_at
  RETURNING cleared_at INTO v_cleared_at;

  RETURN v_cleared_at;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_my_conversation(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.clear_my_conversation(uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_chat_list()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  username text,
  avatar_url text,
  conversation_id uuid,
  last_message text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH accepted_connections AS (
    SELECT
      CASE
        WHEN c.user_id = auth.uid() THEN c.contact_id
        ELSE c.user_id
      END AS other_user_id,
      MAX(c.created_at) AS connected_at
    FROM public.connections AS c
    WHERE
      c.status = 'accepted'
      AND (
        c.user_id = auth.uid()
        OR c.contact_id = auth.uid()
      )
    GROUP BY
      CASE
        WHEN c.user_id = auth.uid() THEN c.contact_id
        ELSE c.user_id
      END
  )
  SELECT
    ac.other_user_id AS user_id,
    COALESCE(
      NULLIF(TRIM(p.full_name), ''),
      NULLIF(TRIM(p.username), ''),
      'Unknown'
    ) AS full_name,
    p.username::text AS username,
    p.avatar_url::text AS avatar_url,
    conv.id AS conversation_id,
    latest.content::text AS last_message,
    latest.created_at AS last_message_at,
    latest.sender_id AS last_message_sender_id,
    COALESCE(unread.total, 0)::bigint AS unread_count
  FROM accepted_connections AS ac
  LEFT JOIN public.profiles AS p
    ON p.id = ac.other_user_id
  LEFT JOIN public.conversations AS conv
    ON conv.user_one_id = LEAST(auth.uid(), ac.other_user_id)
    AND conv.user_two_id = GREATEST(auth.uid(), ac.other_user_id)
  LEFT JOIN public.conversation_user_state AS clear_state
    ON clear_state.conversation_id = conv.id
    AND clear_state.user_id = auth.uid()
  LEFT JOIN LATERAL (
    SELECT
      m.content,
      m.created_at,
      m.sender_id
    FROM public.messages AS m
    WHERE
      m.conversation_id = conv.id
      AND (
        clear_state.cleared_at IS NULL
        OR m.created_at > clear_state.cleared_at
      )
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 1
  ) AS latest ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total
    FROM public.messages AS m
    WHERE
      m.conversation_id = conv.id
      AND m.receiver_id = auth.uid()
      AND m.is_read = false
      AND (
        clear_state.cleared_at IS NULL
        OR m.created_at > clear_state.cleared_at
      )
  ) AS unread ON true
  ORDER BY
    COALESCE(latest.created_at, ac.connected_at) DESC,
    ac.other_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_chat_list()
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_chat_list()
  TO authenticated;