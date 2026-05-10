CREATE OR REPLACE FUNCTION public.student_id_taken(_sid text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE student_id = _sid)
$$;

GRANT EXECUTE ON FUNCTION public.student_id_taken(text) TO anon, authenticated;