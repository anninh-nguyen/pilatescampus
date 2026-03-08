
CREATE TABLE public.cancellation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hours_before integer NOT NULL,
  refund_percentage integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read cancellation policies" ON public.cancellation_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert cancellation policies" ON public.cancellation_policies FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update cancellation policies" ON public.cancellation_policies FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete cancellation policies" ON public.cancellation_policies FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Default tiers
INSERT INTO public.cancellation_policies (hours_before, refund_percentage) VALUES (36, 100), (24, 50), (0, 0);
