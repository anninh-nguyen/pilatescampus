
-- Create trainer level enum
CREATE TYPE public.trainer_level AS ENUM ('trainee_trainer', 'junior', 'senior', 'master');

-- Add level column to trainers table
ALTER TABLE public.trainers ADD COLUMN level trainer_level NOT NULL DEFAULT 'trainee_trainer';

-- Create compensation rates table
CREATE TABLE public.trainer_compensation_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level trainer_level NOT NULL UNIQUE,
  rate_type TEXT NOT NULL DEFAULT 'fixed' CHECK (rate_type IN ('fixed', 'percentage')),
  rate_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trainer_compensation_rates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can read compensation rates" ON public.trainer_compensation_rates FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert compensation rates" ON public.trainer_compensation_rates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update compensation rates" ON public.trainer_compensation_rates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete compensation rates" ON public.trainer_compensation_rates FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Trainers can read own compensation rate" ON public.trainer_compensation_rates FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.trainers t
    WHERE t.user_id = auth.uid() AND t.level = trainer_compensation_rates.level
  )
);

-- Seed the 4 default levels
INSERT INTO public.trainer_compensation_rates (level, rate_type, rate_value) VALUES
  ('trainee_trainer', 'fixed', 0),
  ('junior', 'fixed', 0),
  ('senior', 'fixed', 0),
  ('master', 'fixed', 0);
