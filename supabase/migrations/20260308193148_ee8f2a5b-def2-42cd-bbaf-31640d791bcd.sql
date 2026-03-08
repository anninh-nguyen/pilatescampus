CREATE POLICY "Trainers can update trainee profiles"
ON public.profiles
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'trainer'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = profiles.user_id
      AND user_roles.role = 'trainee'::app_role
  )
)
WITH CHECK (
  has_role(auth.uid(), 'trainer'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = profiles.user_id
      AND user_roles.role = 'trainee'::app_role
  )
);