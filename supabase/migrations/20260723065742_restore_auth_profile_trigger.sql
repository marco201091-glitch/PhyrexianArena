
-- Restore automatic profiles for every Auth signup and repair legacy rows.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
DECLARE
  missing_user record;
  base_username text;
  candidate text;
  suffix integer;
BEGIN
  FOR missing_user IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
  LOOP
    base_username := lower(regexp_replace(
      regexp_replace(
        COALESCE(missing_user.raw_user_meta_data->>'username', split_part(missing_user.email, '@', 1)),
        '\.', '_', 'g'
      ),
      '[^a-zA-Z0-9_]', '', 'g'
    ));
    base_username := left(CASE WHEN char_length(base_username) < 3 THEN 'user' ELSE base_username END, 24);
    candidate := base_username;
    suffix := 0;

    LOOP
      BEGIN
        INSERT INTO public.profiles (id, username)
        VALUES (missing_user.id, candidate);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        suffix := suffix + 1;
        candidate := CASE
          WHEN suffix > 999 THEN 'user_' || left(replace(missing_user.id::text, '-', ''), 8)
          ELSE base_username || '_' || suffix::text
        END;
      END;
    END LOOP;
  END LOOP;
END $$;
