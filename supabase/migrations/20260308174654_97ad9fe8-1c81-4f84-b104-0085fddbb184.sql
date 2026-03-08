
-- Promotion type enum
CREATE TYPE promotion_type AS ENUM ('first_time', 'campaign', 'voucher', 'referral', 'returning');

-- Promotions table
CREATE TABLE promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type promotion_type NOT NULL,
  name text NOT NULL,
  description text,
  credit_amount numeric(10,1) NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Voucher codes
CREATE TABLE voucher_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  redeemed_by uuid,
  redeemed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Referral codes
CREATE TABLE referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Redemption tracking
CREATE TABLE promotion_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid REFERENCES promotions(id) NOT NULL,
  user_id uuid NOT NULL,
  credits_awarded numeric(10,1) NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add referred_by to profiles
ALTER TABLE profiles ADD COLUMN referred_by text;

-- RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_redemptions ENABLE ROW LEVEL SECURITY;

-- Promotions policies
CREATE POLICY "Authenticated can read promotions" ON promotions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert promotions" ON promotions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update promotions" ON promotions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete promotions" ON promotions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Voucher codes policies
CREATE POLICY "Admins can read voucher codes" ON voucher_codes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert voucher codes" ON voucher_codes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update voucher codes" ON voucher_codes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete voucher codes" ON voucher_codes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Trainers can insert voucher codes" ON voucher_codes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'trainer') AND created_by = auth.uid());
CREATE POLICY "Trainers can read own voucher codes" ON voucher_codes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'trainer') AND created_by = auth.uid());
CREATE POLICY "Trainees can read voucher codes" ON voucher_codes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'trainee'));

-- Referral codes policies
CREATE POLICY "Users can read own referral code" ON referral_codes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own referral code" ON referral_codes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can read all referral codes" ON referral_codes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Promotion redemptions policies
CREATE POLICY "Users can read own redemptions" ON promotion_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all redemptions" ON promotion_redemptions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert redemptions" ON promotion_redemptions FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update handle_new_user to store referred_by
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'referred_by'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'trainee');
  RETURN NEW;
END;
$$;

-- Voucher redemption function
CREATE OR REPLACE FUNCTION public.redeem_voucher(_code text, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_voucher voucher_codes%ROWTYPE;
  v_promotion promotions%ROWTYPE;
  v_pkg trainee_packages%ROWTYPE;
BEGIN
  SELECT * INTO v_voucher FROM voucher_codes WHERE code = _code AND redeemed_by IS NULL AND expires_at > now();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired voucher code');
  END IF;

  SELECT * INTO v_promotion FROM promotions WHERE id = v_voucher.promotion_id AND is_active = true AND type = 'voucher';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promotion not active');
  END IF;

  IF v_promotion.end_date IS NOT NULL AND v_promotion.end_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promotion has expired');
  END IF;

  SELECT * INTO v_pkg FROM trainee_packages WHERE trainee_id = _user_id AND is_active = true ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active package');
  END IF;

  UPDATE voucher_codes SET redeemed_by = _user_id, redeemed_at = now() WHERE id = v_voucher.id;
  UPDATE trainee_packages SET remaining_credits = remaining_credits + v_promotion.credit_amount WHERE id = v_pkg.id;
  INSERT INTO promotion_redemptions (promotion_id, user_id, credits_awarded, metadata)
  VALUES (v_promotion.id, _user_id, v_promotion.credit_amount, jsonb_build_object('voucher_code', _code));

  RETURN jsonb_build_object('success', true, 'credits', v_promotion.credit_amount);
END;
$$;

-- First-time bonus function
CREATE OR REPLACE FUNCTION public.check_first_time_bonus(_user_id uuid, _package_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_promo promotions%ROWTYPE;
  v_prev_count int;
BEGIN
  SELECT COUNT(*) INTO v_prev_count FROM trainee_packages WHERE trainee_id = _user_id;
  IF v_prev_count > 1 THEN RETURN 0; END IF;

  SELECT * INTO v_promo FROM promotions WHERE type = 'first_time' AND is_active = true AND start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE) ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF EXISTS (SELECT 1 FROM promotion_redemptions WHERE promotion_id = v_promo.id AND user_id = _user_id) THEN RETURN 0; END IF;

  UPDATE trainee_packages SET remaining_credits = remaining_credits + v_promo.credit_amount WHERE id = _package_id;
  INSERT INTO promotion_redemptions (promotion_id, user_id, credits_awarded) VALUES (v_promo.id, _user_id, v_promo.credit_amount);

  RETURN v_promo.credit_amount;
END;
$$;

-- Referral bonus function
CREATE OR REPLACE FUNCTION public.check_referral_bonus(_new_user_id uuid, _package_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ref_code text;
  v_referrer_id uuid;
  v_promo promotions%ROWTYPE;
  v_referrer_pkg trainee_packages%ROWTYPE;
BEGIN
  SELECT referred_by INTO v_ref_code FROM profiles WHERE user_id = _new_user_id;
  IF v_ref_code IS NULL THEN RETURN 0; END IF;

  SELECT user_id INTO v_referrer_id FROM referral_codes WHERE code = v_ref_code;
  IF v_referrer_id IS NULL THEN RETURN 0; END IF;

  SELECT * INTO v_promo FROM promotions WHERE type = 'referral' AND is_active = true AND start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE) ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF EXISTS (SELECT 1 FROM promotion_redemptions WHERE promotion_id = v_promo.id AND user_id = v_referrer_id AND metadata->>'referred_user' = _new_user_id::text) THEN RETURN 0; END IF;

  SELECT * INTO v_referrer_pkg FROM trainee_packages WHERE trainee_id = v_referrer_id AND is_active = true ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN 0; END IF;

  UPDATE trainee_packages SET remaining_credits = remaining_credits + v_promo.credit_amount WHERE id = v_referrer_pkg.id;
  INSERT INTO promotion_redemptions (promotion_id, user_id, credits_awarded, metadata) VALUES (v_promo.id, v_referrer_id, v_promo.credit_amount, jsonb_build_object('referred_user', _new_user_id::text));

  RETURN v_promo.credit_amount;
END;
$$;

-- Returning customer check function
CREATE OR REPLACE FUNCTION public.check_returning_bonus(_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_promo promotions%ROWTYPE;
  v_pkg trainee_packages%ROWTYPE;
  v_last_booking timestamptz;
BEGIN
  SELECT * INTO v_promo FROM promotions WHERE type = 'returning' AND is_active = true AND start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE) ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT MAX(b.created_at) INTO v_last_booking FROM bookings b WHERE b.trainee_id = _user_id AND b.status = 'confirmed';
  IF v_last_booking IS NULL OR v_last_booking > (now() - interval '3 months') THEN RETURN 0; END IF;

  IF EXISTS (SELECT 1 FROM promotion_redemptions WHERE promotion_id = v_promo.id AND user_id = _user_id AND created_at > v_last_booking) THEN RETURN 0; END IF;

  SELECT * INTO v_pkg FROM trainee_packages WHERE trainee_id = _user_id AND is_active = true ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN 0; END IF;

  UPDATE trainee_packages SET remaining_credits = remaining_credits + v_promo.credit_amount WHERE id = v_pkg.id;
  INSERT INTO promotion_redemptions (promotion_id, user_id, credits_awarded) VALUES (v_promo.id, _user_id, v_promo.credit_amount);

  RETURN v_promo.credit_amount;
END;
$$;
