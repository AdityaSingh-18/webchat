INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'chat-media',
  'chat-media',
  false,
  104857600,
  NULL
)
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


ALTER TABLE public.conversations
ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.conversations TO authenticated;


CREATE POLICY "chat media participants can read conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  user_one_id = (SELECT auth.uid())
  OR user_two_id = (SELECT auth.uid())
);


CREATE POLICY "chat media participants can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1
    FROM public.conversations AS c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (
        c.user_one_id = (SELECT auth.uid())
        OR c.user_two_id = (SELECT auth.uid())
      )
  )
);


CREATE POLICY "chat media participants can view"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1
    FROM public.conversations AS c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (
        c.user_one_id = (SELECT auth.uid())
        OR c.user_two_id = (SELECT auth.uid())
      )
  )
);


CREATE POLICY "chat media uploaders can delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND owner_id = (SELECT auth.uid()::text)
  AND EXISTS (
    SELECT 1
    FROM public.conversations AS c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (
        c.user_one_id = (SELECT auth.uid())
        OR c.user_two_id = (SELECT auth.uid())
      )
  )
);