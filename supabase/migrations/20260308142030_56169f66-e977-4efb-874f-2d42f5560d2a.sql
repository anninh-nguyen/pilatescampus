
-- Fix: Change ALL restrictive policies to permissive across all tables

-- ========== bookings ==========
DROP POLICY IF EXISTS "Admins can read all bookings" ON public.bookings;
CREATE POLICY "Admins can read all bookings" ON public.bookings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Trainees can insert bookings" ON public.bookings;
CREATE POLICY "Trainees can insert bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = trainee_id
  AND public.has_role(auth.uid(), 'trainee'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.trainee_packages
    WHERE id = trainee_package_id AND trainee_id = auth.uid() AND is_active = true
  )
);

DROP POLICY IF EXISTS "Trainees can read own bookings" ON public.bookings;
CREATE POLICY "Trainees can read own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = trainee_id);

DROP POLICY IF EXISTS "Trainees can update own bookings" ON public.bookings;
CREATE POLICY "Trainees can update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = trainee_id);

DROP POLICY IF EXISTS "Trainers can read their class bookings" ON public.bookings;
CREATE POLICY "Trainers can read their class bookings" ON public.bookings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM class_slots cs JOIN trainers t ON cs.trainer_id = t.id WHERE cs.id = bookings.class_slot_id AND t.user_id = auth.uid())
);

-- ========== class_slots ==========
DROP POLICY IF EXISTS "Admins can delete class slots" ON public.class_slots;
CREATE POLICY "Admins can delete class slots" ON public.class_slots FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert class slots" ON public.class_slots;
CREATE POLICY "Admins can insert class slots" ON public.class_slots FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update class slots" ON public.class_slots;
CREATE POLICY "Admins can update class slots" ON public.class_slots FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read class slots" ON public.class_slots;
CREATE POLICY "Authenticated can read class slots" ON public.class_slots FOR SELECT TO authenticated USING (true);

-- ========== notifications ==========
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications" ON public.notifications FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ========== packages ==========
DROP POLICY IF EXISTS "Admins can delete packages" ON public.packages;
CREATE POLICY "Admins can delete packages" ON public.packages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert packages" ON public.packages;
CREATE POLICY "Admins can insert packages" ON public.packages FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update packages" ON public.packages;
CREATE POLICY "Admins can update packages" ON public.packages FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read packages" ON public.packages;
CREATE POLICY "Authenticated can read packages" ON public.packages FOR SELECT TO authenticated USING (true);

-- ========== profiles ==========
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ========== trainee_packages ==========
DROP POLICY IF EXISTS "Admins can insert trainee packages" ON public.trainee_packages;
CREATE POLICY "Admins can insert trainee packages" ON public.trainee_packages FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can read all trainee packages" ON public.trainee_packages;
CREATE POLICY "Admins can read all trainee packages" ON public.trainee_packages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update trainee packages" ON public.trainee_packages;
CREATE POLICY "Admins can update trainee packages" ON public.trainee_packages FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Trainees can read own packages" ON public.trainee_packages;
CREATE POLICY "Trainees can read own packages" ON public.trainee_packages FOR SELECT TO authenticated USING (auth.uid() = trainee_id);

-- ========== trainers ==========
DROP POLICY IF EXISTS "Admins can delete trainers" ON public.trainers;
CREATE POLICY "Admins can delete trainers" ON public.trainers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert trainers" ON public.trainers;
CREATE POLICY "Admins can insert trainers" ON public.trainers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update trainers" ON public.trainers;
CREATE POLICY "Admins can update trainers" ON public.trainers FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read trainers" ON public.trainers;
CREATE POLICY "Authenticated can read trainers" ON public.trainers FOR SELECT TO authenticated USING (true);

-- ========== user_roles ==========
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
