-- Generate unique profile usernames for OAuth signups (email prefix collisions).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  base_username text;
  candidate text;
  suffix integer := 0;
BEGIN
  base_username := lower(
    regexp_replace(
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
      '[^a-zA-Z0-9_]',
      '',
      'g'
    )
  );

  IF char_length(base_username) < 3 THEN
    base_username := 'user';
  END IF;

  base_username := left(base_username, 24);
  candidate := base_username;

  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username)
      VALUES (NEW.id, candidate);
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        suffix := suffix + 1;
        IF suffix > 999 THEN
          candidate := 'user_' || left(replace(NEW.id::text, '-', ''), 8);
          INSERT INTO public.profiles (id, username)
          VALUES (NEW.id, candidate);
          EXIT;
        END IF;
        candidate := base_username || '_' || suffix::text;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;