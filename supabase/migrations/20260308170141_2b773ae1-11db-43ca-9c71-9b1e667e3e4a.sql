
-- Change credit columns from integer to numeric(10,1) for decimal support
ALTER TABLE public.trainee_packages ALTER COLUMN remaining_credits TYPE numeric(10,1);
ALTER TABLE public.packages ALTER COLUMN credit_count TYPE numeric(10,1);
ALTER TABLE public.time_pricing ALTER COLUMN credit_cost TYPE numeric(10,1);
ALTER TABLE public.cancellation_policies ALTER COLUMN refund_percentage TYPE numeric(10,1);
