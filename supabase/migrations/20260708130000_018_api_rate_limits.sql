-- API rate limiting buckets for protected routes.

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  bucket_key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.api_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  p_bucket_key text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_row public.api_rate_limits%ROWTYPE;
  now_ts timestamptz := now();
  window_end timestamptz;
  next_count integer;
BEGIN
  IF p_bucket_key IS NULL OR length(trim(p_bucket_key)) = 0 THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', p_max_requests, 'retry_after_seconds', 0);
  END IF;

  IF p_max_requests <= 0 OR p_window_seconds <= 0 THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', p_max_requests, 'retry_after_seconds', 0);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_bucket_key));

  SELECT *
  INTO current_row
  FROM public.api_rate_limits
  WHERE bucket_key = p_bucket_key;

  IF NOT FOUND THEN
    INSERT INTO public.api_rate_limits (bucket_key, window_start, request_count)
    VALUES (p_bucket_key, now_ts, 1);

    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', GREATEST(0, p_max_requests - 1),
      'retry_after_seconds', 0
    );
  END IF;

  window_end := current_row.window_start + make_interval(secs => p_window_seconds);

  IF now_ts >= window_end THEN
    UPDATE public.api_rate_limits
    SET window_start = now_ts,
        request_count = 1
    WHERE bucket_key = p_bucket_key;

    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', GREATEST(0, p_max_requests - 1),
      'retry_after_seconds', 0
    );
  END IF;

  IF current_row.request_count >= p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after_seconds', GREATEST(1, CEIL(EXTRACT(EPOCH FROM (window_end - now_ts)))::integer)
    );
  END IF;

  next_count := current_row.request_count + 1;

  UPDATE public.api_rate_limits
  SET request_count = next_count
  WHERE bucket_key = p_bucket_key;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', GREATEST(0, p_max_requests - next_count),
    'retry_after_seconds', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_api_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_api_rate_limit(text, integer, integer) TO service_role;