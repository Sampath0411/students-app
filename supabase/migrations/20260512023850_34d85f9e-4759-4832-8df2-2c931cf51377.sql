
-- Signup logs table
CREATE TABLE IF NOT EXISTS public.signup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  stage text NOT NULL,
  success boolean NOT NULL DEFAULT true,
  email text,
  student_id text,
  user_id uuid,
  message text,
  details jsonb
);

CREATE INDEX IF NOT EXISTS idx_signup_logs_created_at ON public.signup_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_logs_email ON public.signup_logs (email);

ALTER TABLE public.signup_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read signup logs" ON public.signup_logs;
CREATE POLICY "Admins read signup logs"
  ON public.signup_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Logging RPC (safe to call from anon — only inserts a single bounded row)
CREATE OR REPLACE FUNCTION public.log_signup_event(
  _stage text,
  _success boolean,
  _email text DEFAULT NULL,
  _student_id text DEFAULT NULL,
  _user_id uuid DEFAULT NULL,
  _message text DEFAULT NULL,
  _details jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.signup_logs (stage, success, email, student_id, user_id, message, details)
  VALUES (
    left(coalesce(_stage,'unknown'), 100),
    coalesce(_success, true),
    left(_email, 255),
    left(_student_id, 100),
    _user_id,
    left(_message, 1000),
    _details
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_signup_event(text, boolean, text, text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_signup_event(text, boolean, text, text, uuid, text, jsonb) TO anon, authenticated;

-- Rewrite handle_new_user with detailed logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_student_id text;
  final_student_id text;
  initial_status public.profile_status := 'pending';
  is_admin boolean;
BEGIN
  is_admin := (NEW.raw_user_meta_data->>'is_admin')::boolean IS TRUE;

  PERFORM public.log_signup_event(
    'trigger.start', true, NEW.email, NEW.raw_user_meta_data->>'student_id', NEW.id,
    'handle_new_user invoked',
    jsonb_build_object('is_admin', is_admin, 'meta', NEW.raw_user_meta_data)
  );

  IF is_admin THEN
    BEGIN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
      PERFORM public.log_signup_event('trigger.admin_role', true, NEW.email, NULL, NEW.id, 'admin role assigned', NULL);
    EXCEPTION WHEN OTHERS THEN
      PERFORM public.log_signup_event('trigger.admin_role', false, NEW.email, NULL, NEW.id, SQLERRM,
        jsonb_build_object('sqlstate', SQLSTATE));
      RAISE;
    END;
    RETURN NEW;
  END IF;

  requested_student_id := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'student_id','')), '');
  final_student_id := COALESCE(requested_student_id, NEW.id::text);

  IF requested_student_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(btrim(student_id)) = lower(requested_student_id)
  ) THEN
    final_student_id := NEW.id::text;
    initial_status := 'rejected';
    PERFORM public.log_signup_event(
      'trigger.duplicate_student_id', false, NEW.email, requested_student_id, NEW.id,
      'Requested registration number already exists; profile created as rejected',
      NULL
    );
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, full_name, email, student_id, phone, department, date_of_birth, status)
    VALUES (
      NEW.id,
      COALESCE(btrim(NEW.raw_user_meta_data->>'full_name'),''),
      NEW.email,
      final_student_id,
      NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'phone','')),''),
      NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'department','')),''),
      NULLIF(NEW.raw_user_meta_data->>'date_of_birth','')::date,
      initial_status
    )
    ON CONFLICT (id) DO NOTHING;
    PERFORM public.log_signup_event('trigger.profile_insert', true, NEW.email, final_student_id, NEW.id,
      'profile inserted', jsonb_build_object('status', initial_status));
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.log_signup_event('trigger.profile_insert', false, NEW.email, final_student_id, NEW.id,
      SQLERRM, jsonb_build_object('sqlstate', SQLSTATE));
    RAISE;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;
    PERFORM public.log_signup_event('trigger.student_role', true, NEW.email, final_student_id, NEW.id,
      'student role assigned', NULL);
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.log_signup_event('trigger.student_role', false, NEW.email, final_student_id, NEW.id,
      SQLERRM, jsonb_build_object('sqlstate', SQLSTATE));
    RAISE;
  END;

  PERFORM public.log_signup_event('trigger.complete', true, NEW.email, final_student_id, NEW.id,
    'handle_new_user finished', NULL);

  RETURN NEW;
END;
$$;

-- Make sure trigger exists on auth.users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
