CREATE OR REPLACE FUNCTION public.student_id_taken(_sid text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(btrim(student_id)) = lower(btrim(coalesce(_sid, '')))
  )
$$;

GRANT EXECUTE ON FUNCTION public.student_id_taken(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_student_id text;
  final_student_id text;
  initial_status public.profile_status := 'pending';
BEGIN
  IF (NEW.raw_user_meta_data->>'is_admin')::boolean IS TRUE THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  END IF;

  requested_student_id := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'student_id', '')), '');
  final_student_id := COALESCE(requested_student_id, NEW.id::text);

  IF requested_student_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(btrim(student_id)) = lower(requested_student_id)
  ) THEN
    final_student_id := NEW.id::text;
    initial_status := 'rejected';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, student_id, phone, department, date_of_birth, status)
  VALUES (
    NEW.id,
    COALESCE(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    NEW.email,
    final_student_id,
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'department', '')), ''),
    NULLIF(NEW.raw_user_meta_data->>'date_of_birth','')::date,
    initial_status
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;