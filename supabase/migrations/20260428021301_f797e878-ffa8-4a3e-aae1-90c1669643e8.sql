-- Add locked flag to login_codes for QR locking after attendance scan
ALTER TABLE public.login_codes
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_reason text;

-- Allow admins to update login_codes (to unlock)
DROP POLICY IF EXISTS "Admins update login codes" ON public.login_codes;
CREATE POLICY "Admins update login codes"
ON public.login_codes
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger: when attendance is marked (insert), lock the student's current login code
CREATE OR REPLACE FUNCTION public.lock_qr_on_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.login_codes
     SET locked = true,
         locked_at = now(),
         locked_reason = 'attendance_marked'
   WHERE user_id = NEW.student_id
     AND locked = false;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_lock_qr_on_attendance ON public.attendance;
CREATE TRIGGER trg_lock_qr_on_attendance
AFTER INSERT ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.lock_qr_on_attendance();
