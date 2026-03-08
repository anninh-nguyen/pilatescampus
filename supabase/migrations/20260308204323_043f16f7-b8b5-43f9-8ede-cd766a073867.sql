
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read site settings"
ON public.site_settings FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert site settings"
ON public.site_settings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update site settings"
ON public.site_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete site settings"
ON public.site_settings FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions can read settings via service role (no RLS needed for service role)

-- Seed default email settings
INSERT INTO public.site_settings (key, value) VALUES
  ('email_sender_name', 'Pilates Campus'),
  ('email_reply_to', ''),
  ('email_subject_invitation', 'You''re invited to join Pilates Campus'),
  ('email_subject_booking_reminder', 'Reminder: Your session is coming up'),
  ('email_subject_low_credits', 'Your credits are running low'),
  ('email_subject_package_expiry', 'Your package is expiring soon'),
  ('email_subject_promotion', 'Special offer from Pilates Campus'),
  ('email_body_invitation', 'You have been invited to join Pilates Campus. Click the link below to get started.'),
  ('email_body_booking_reminder', 'This is a reminder that your session is coming up soon. See you there!'),
  ('email_body_low_credits', 'Your credit balance is running low. Consider purchasing a new package to continue booking sessions.'),
  ('email_body_package_expiry', 'Your package is expiring soon. Renew to keep your credits active.'),
  ('email_body_promotion', 'We have a special promotion for you! Check it out.');

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
