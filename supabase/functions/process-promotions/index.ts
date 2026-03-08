import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const { action, promotion_id } = body;

    if (action === "send_campaign") {
      // Send campaign notifications + emails to all active trainees
      const { data: promo } = await supabase
        .from("promotions")
        .select("*")
        .eq("id", promotion_id)
        .eq("type", "campaign")
        .eq("is_active", true)
        .single();

      if (!promo) {
        return new Response(JSON.stringify({ error: "Promotion not found or not active" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all trainees with active packages
      const { data: traineePkgs } = await supabase
        .from("trainee_packages")
        .select("trainee_id")
        .eq("is_active", true);

      if (!traineePkgs || traineePkgs.length === 0) {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const traineeIds = [...new Set(traineePkgs.map((tp: any) => tp.trainee_id))];

      // Get trainee profiles for email
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", traineeIds);

      // Create in-app notifications
      const notifications = traineeIds.map((tid: string) => ({
        user_id: tid,
        title: `🎉 ${promo.name}`,
        message: promo.description || `You can earn ${promo.credit_amount} bonus credits! ${promo.end_date ? `Valid until ${promo.end_date}.` : ""}`,
        type: "promotion",
      }));

      await supabase.from("notifications").insert(notifications);

      // Award credits to each trainee's active package
      for (const tid of traineeIds) {
        // Check if already redeemed
        const { data: existing } = await supabase
          .from("promotion_redemptions")
          .select("id")
          .eq("promotion_id", promo.id)
          .eq("user_id", tid)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Add credits
        const { data: pkg } = await supabase
          .from("trainee_packages")
          .select("id, remaining_credits")
          .eq("trainee_id", tid)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (pkg) {
          await supabase
            .from("trainee_packages")
            .update({ remaining_credits: Number(pkg.remaining_credits) + Number(promo.credit_amount) })
            .eq("id", pkg.id);

          await supabase.from("promotion_redemptions").insert({
            promotion_id: promo.id,
            user_id: tid,
            credits_awarded: promo.credit_amount,
          });
        }
      }

      // Log emails (actual sending requires domain setup)
      for (const p of (profiles || [])) {
        console.log(`[CAMPAIGN EMAIL] To: ${p.email}, Subject: ${promo.name}, Credits: ${promo.credit_amount}`);
      }

      return new Response(JSON.stringify({ sent: traineeIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_returning") {
      // Find trainees who haven't booked in 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: activeTrainees } = await supabase
        .from("trainee_packages")
        .select("trainee_id")
        .eq("is_active", true);

      if (!activeTrainees) {
        return new Response(JSON.stringify({ notified: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const traineeIds = [...new Set(activeTrainees.map((t: any) => t.trainee_id))];
      let notified = 0;

      for (const tid of traineeIds) {
        const { data: recentBooking } = await supabase
          .from("bookings")
          .select("id")
          .eq("trainee_id", tid)
          .eq("status", "confirmed")
          .gte("created_at", threeMonthsAgo.toISOString())
          .limit(1);

        if (recentBooking && recentBooking.length > 0) continue;

        // Check if already notified recently
        const { data: recentNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", tid)
          .eq("type", "returning_customer")
          .gte("created_at", threeMonthsAgo.toISOString())
          .limit(1);

        if (recentNotif && recentNotif.length > 0) continue;

        // Send notification
        await supabase.from("notifications").insert({
          user_id: tid,
          title: "We miss you! 🏋️",
          message: "It's been a while since your last session. Come back and earn bonus credits!",
          type: "returning_customer",
        });

        // Log email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", tid)
          .single();

        if (profile) {
          console.log(`[RETURNING EMAIL] To: ${profile.email}, Subject: We miss you!`);
        }

        notified++;
      }

      return new Response(JSON.stringify({ notified }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
