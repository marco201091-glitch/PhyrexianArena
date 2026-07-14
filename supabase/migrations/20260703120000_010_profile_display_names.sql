-- Add an optional display nickname that does not affect login username.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text;

COMMENT ON COLUMN public.profiles.display_name IS
  'Optional nickname shown in the app. Username remains unchanged for login and administration.';
