CREATE POLICY "Trainees can update own package credits"
ON public.trainee_packages
FOR UPDATE
TO authenticated
USING (auth.uid() = trainee_id)
WITH CHECK (auth.uid() = trainee_id);