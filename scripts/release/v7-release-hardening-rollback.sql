-- Rollback only 20260729160414_v7_release_hardening.
-- Permanent matches and participant facts are never touched.
BEGIN;

DROP FUNCTION IF EXISTS public.get_profile_deck_performance(uuid);
DROP INDEX IF EXISTS public.idx_match_participants_deck_match;

DROP POLICY IF EXISTS "avatars_select_metadata_for_upsert" ON storage.objects;
CREATE POLICY "avatars_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.is_admin((SELECT auth.uid()))
    )
  );

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS avatar_revision;

COMMIT;
NOTIFY pgrst, 'reload schema';
