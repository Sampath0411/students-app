
-- ============ ASSIGNMENTS ============
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_date date,
  file_url text,
  file_name text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view assignments" ON public.assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============ ASSIGNMENT GRADES ============
CREATE TABLE public.assignment_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  score numeric,
  max_score numeric DEFAULT 100,
  feedback text,
  graded_by uuid,
  graded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);
ALTER TABLE public.assignment_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own grades" ON public.assignment_grades
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Admins manage grades" ON public.assignment_grades
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============ RECORDS (academic marks) ============
CREATE TABLE public.records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject text NOT NULL,
  term text,
  score numeric,
  max_score numeric DEFAULT 100,
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own records" ON public.records
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Admins manage records" ON public.records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============ ANNOUNCEMENTS ============
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view announcements" ON public.announcements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  category text NOT NULL DEFAULT 'general',
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============ LOGIN QR CODES ============
CREATE TABLE public.login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.login_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own login code" ON public.login_codes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users upsert own login code" ON public.login_codes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own login code" ON public.login_codes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all codes" ON public.login_codes
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============ PROFILE EDIT TRACKING ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_profile_edit timestamptz;

-- Allow students to update broader fields (still not status / id / email / student_id)
DROP POLICY IF EXISTS "Students update own profile basic" ON public.profiles;
CREATE POLICY "Students update own profile basic" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND status = (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid())
    AND email = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
    AND student_id = (SELECT p.student_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ============ NOTIFICATION TRIGGERS ============
CREATE OR REPLACE FUNCTION public.notify_on_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, category, link)
  SELECT p.id, 'New assignment: ' || NEW.title, NEW.description, 'assignment', '/assignments'
  FROM public.profiles p WHERE p.status = 'approved';
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_assignment AFTER INSERT ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_assignment();

CREATE OR REPLACE FUNCTION public.notify_on_announcement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, category, link)
  SELECT p.id, 'Announcement: ' || NEW.title, NEW.body, 'announcement', '/announcements'
  FROM public.profiles p WHERE p.status = 'approved';
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_announcement AFTER INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_announcement();

CREATE OR REPLACE FUNCTION public.notify_on_grade()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE atitle text;
BEGIN
  SELECT title INTO atitle FROM public.assignments WHERE id = NEW.assignment_id;
  INSERT INTO public.notifications (user_id, title, body, category, link)
  VALUES (NEW.student_id, 'Assignment graded: ' || COALESCE(atitle,''),
    'Score: ' || COALESCE(NEW.score::text,'-') || '/' || COALESCE(NEW.max_score::text,'100'),
    'grade', '/assignments');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_grade AFTER INSERT OR UPDATE ON public.assignment_grades
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_grade();

CREATE OR REPLACE FUNCTION public.notify_on_record()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, category, link)
  VALUES (NEW.student_id, 'New record: ' || NEW.subject,
    'Score: ' || COALESCE(NEW.score::text,'-') || '/' || COALESCE(NEW.max_score::text,'100'),
    'record', '/records');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_record AFTER INSERT ON public.records
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_record();

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('assignments', 'assignments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read assignment files" ON storage.objects
  FOR SELECT USING (bucket_id = 'assignments');
CREATE POLICY "Admins upload assignment files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assignments' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update assignment files" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'assignments' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete assignment files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'assignments' AND has_role(auth.uid(), 'admin'));
