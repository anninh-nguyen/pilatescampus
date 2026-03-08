
-- Create classes table (parent of class_slots)
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  trainer_id UUID NOT NULL REFERENCES public.trainers(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL,
  class_type TEXT NOT NULL DEFAULT 'group',
  recurrence_days INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add parent_class_id to class_slots with cascade delete
ALTER TABLE public.class_slots ADD COLUMN parent_class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated can read classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert classes" ON public.classes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update classes" ON public.classes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete classes" ON public.classes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
