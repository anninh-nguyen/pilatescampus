-- Allow trainers to read trainee roles (needed for Book on Behalf)
CREATE POLICY "Trainers can read trainee roles"
ON public.user_roles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'trainer'::app_role)
  AND role = 'trainee'::app_role
);