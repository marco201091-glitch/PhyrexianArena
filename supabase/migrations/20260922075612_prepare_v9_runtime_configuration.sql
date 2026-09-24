UPDATE public.app_runtime_configuration
SET
  recommended_version = '9.0.0',
  release_notes = COALESCE(release_notes, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'version', '9.0.0',
      'it', 'Preparazione della versione 9 con affidabilita e compatibilita migliorate.',
      'en', 'Version 9 preparation with improved reliability and compatibility.'
    )
  ),
  updated_at = now()
WHERE id = true;
