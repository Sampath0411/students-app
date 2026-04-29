ALTER TABLE public.login_codes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_codes;