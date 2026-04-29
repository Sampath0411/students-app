-- Chatbot conversations
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own conversations" ON public.chat_conversations
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_chat_conv_user ON public.chat_conversations(user_id, updated_at DESC);

CREATE TRIGGER chat_conv_touch BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Chatbot messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chat messages" ON public.chat_messages
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_chat_msg_conv ON public.chat_messages(conversation_id, created_at);

-- Chatbot per-user settings (bot nickname)
CREATE TABLE public.chat_settings (
  user_id uuid PRIMARY KEY,
  bot_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chat settings" ON public.chat_settings
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER chat_settings_touch BEFORE UPDATE ON public.chat_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- App settings (maintenance mode etc.)
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anonymous can read settings" ON public.app_settings
  FOR SELECT TO anon USING (true);
CREATE POLICY "Admins manage settings" ON public.app_settings
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

INSERT INTO public.app_settings(key,value) VALUES ('maintenance', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ID card on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card_name text;

-- Storage bucket for id cards (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('id-cards','id-cards', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own id card" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id='id-cards' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own id card" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id='id-cards' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin')));
CREATE POLICY "Users update own id card" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id='id-cards' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins manage id cards" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id='id-cards' AND has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='id-cards' AND has_role(auth.uid(),'admin'));