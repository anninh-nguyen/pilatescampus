
-- Fix overly permissive policy on promotion_redemptions
DROP POLICY "Authenticated can insert redemptions" ON promotion_redemptions;
CREATE POLICY "Users can insert own redemptions" ON promotion_redemptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
