-- Allow username-based login by resolving a profile username to its auth email.

CREATE OR REPLACE FUNCTION public.resolve_login_email(identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_identifier text;
  resolved_email text;
BEGIN
  normalized_identifier := btrim(identifier);

  IF normalized_identifier IS NULL OR normalized_identifier = '' THEN
    RETURN NULL;
  END IF;

  IF position('@' IN normalized_identifier) > 0 THEN
    RETURN normalized_identifier;
  END IF;

  SELECT auth_users.email
  INTO resolved_email
  FROM public.profiles
  JOIN auth.users AS auth_users ON auth_users.id = profiles.id
  WHERE lower(profiles.username) = lower(normalized_identifier)
  LIMIT 1;

  RETURN resolved_email;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated;
