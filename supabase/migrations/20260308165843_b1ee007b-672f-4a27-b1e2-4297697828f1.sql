
-- Admin can insert bookings on behalf of trainees
CREATE POLICY "Admins can insert bookings" ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trainers can insert bookings for their own class slots
CREATE POLICY "Trainers can insert bookings for their classes" ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'trainer'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.class_slots cs
    JOIN public.trainers t ON cs.trainer_id = t.id
    WHERE cs.id = bookings.class_slot_id AND t.user_id = auth.uid()
  )
);

-- Admin can update bookings (for cancellations on behalf)
CREATE POLICY "Admins can update all bookings" ON public.bookings
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trainers can update trainee_packages (for credit deduction when booking on behalf)
CREATE POLICY "Trainers can update trainee packages for booking" ON public.trainee_packages
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'trainer'::app_role));

-- Trainers can read trainee packages (to check credits)
CREATE POLICY "Trainers can read trainee packages" ON public.trainee_packages
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'trainer'::app_role));
