GRANT UPDATE ON TABLE public.messages TO authenticated;

DROP POLICY IF EXISTS "Users can edit their own messages"
ON public.messages;

CREATE POLICY "Users can edit their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
    sender_id = (SELECT auth.uid())
)
WITH CHECK (
    sender_id = (SELECT auth.uid())
);