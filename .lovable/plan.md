

## Plan: Allow trainers to update trainee profiles

### Problem
Currently, only admins and users themselves can update profiles. Trainers need the ability to update trainee profiles (e.g., name, phone) but lack the RLS permission.

### Solution
Add a single RLS policy on `public.profiles` allowing trainers to update profiles that belong to trainees.

### Database Migration

```sql
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
```

No code changes needed — trainers already have read access to trainee profiles and the edit UI in `AdminTrainees.tsx` is admin-only. If trainers also need an edit UI, that would be a separate task.

