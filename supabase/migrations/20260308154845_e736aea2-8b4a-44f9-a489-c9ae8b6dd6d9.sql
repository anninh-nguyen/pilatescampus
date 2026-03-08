
CREATE TABLE public.time_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  tier text NOT NULL DEFAULT 'off_peak' CHECK (tier IN ('peak', 'shoulder', 'off_peak')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  credit_cost integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.time_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read time pricing" ON public.time_pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert time pricing" ON public.time_pricing FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update time pricing" ON public.time_pricing FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete time pricing" ON public.time_pricing FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default time periods
INSERT INTO public.time_pricing (label, tier, start_time, end_time, credit_cost) VALUES
  ('Morning Off-Peak', 'off_peak', '06:00', '09:00', 1),
  ('Morning Peak', 'peak', '09:00', '12:00', 2),
  ('Afternoon Shoulder', 'shoulder', '12:00', '16:00', 1),
  ('Afternoon Peak', 'peak', '16:00', '19:00', 2),
  ('Evening Off-Peak', 'off_peak', '19:00', '22:00', 1);
