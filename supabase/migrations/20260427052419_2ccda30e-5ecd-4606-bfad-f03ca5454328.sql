-- Add period (timetable slot) to attendance
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS timetable_id uuid;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS period_label text;

-- Drop old unique on (student_id, date) if present, replace with (student_id, date, timetable_id)
DO $$
DECLARE c_name text;
BEGIN
  SELECT conname INTO c_name FROM pg_constraint
    WHERE conrelid = 'public.attendance'::regclass AND contype='u'
    AND pg_get_constraintdef(oid) ILIKE '%(student_id, date)%';
  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.attendance DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_date_period_uniq
  ON public.attendance (student_id, date, COALESCE(timetable_id::text,'__none__'));
