-- Avatar fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_style text DEFAULT 'micah',
  ADD COLUMN IF NOT EXISTS avatar_seed text;

-- Attendance audit log table
CREATE TABLE IF NOT EXISTS public.attendance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid,
  student_id uuid NOT NULL,
  date date NOT NULL,
  timetable_id uuid,
  subject text,
  period_label text,
  old_status attendance_status,
  new_status attendance_status NOT NULL,
  changed_by uuid,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit"
  ON public.attendance_audit FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Students read own audit"
  ON public.attendance_audit FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Admins insert audit"
  ON public.attendance_audit FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger function
CREATE OR REPLACE FUNCTION public.log_attendance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.attendance_audit
      (attendance_id, student_id, date, timetable_id, subject, period_label,
       old_status, new_status, changed_by, action)
    VALUES (NEW.id, NEW.student_id, NEW.date, NEW.timetable_id, NEW.subject, NEW.period_label,
            NULL, NEW.status, NEW.marked_by, 'create');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.attendance_audit
      (attendance_id, student_id, date, timetable_id, subject, period_label,
       old_status, new_status, changed_by, action)
    VALUES (NEW.id, NEW.student_id, NEW.date, NEW.timetable_id, NEW.subject, NEW.period_label,
            OLD.status, NEW.status, NEW.marked_by, 'update');
    RETURN NEW;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_attendance_audit ON public.attendance;
CREATE TRIGGER trg_attendance_audit
AFTER INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.log_attendance_change();

CREATE INDEX IF NOT EXISTS idx_attendance_audit_student ON public.attendance_audit(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_attendance ON public.attendance_audit(attendance_id);