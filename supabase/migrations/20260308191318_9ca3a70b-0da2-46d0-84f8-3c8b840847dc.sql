CREATE POLICY "Trainers can insert notifications for trainees"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'trainer'::app_role)
);