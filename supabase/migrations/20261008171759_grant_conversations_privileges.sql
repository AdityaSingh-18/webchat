BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.conversations
TO authenticated;

COMMIT;