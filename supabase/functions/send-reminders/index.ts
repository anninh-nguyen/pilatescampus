import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const results = { bookingReminders: 0, lowCredits: 0, expiryWarnings: 0 };

    // ── 1. Booking reminders (2 days before) ──
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const twoDaysMinus1h = new Date(twoDaysFromNow.getTime() - 60 * 60 * 1000);

    const { data: upcomingBookings } = await supabase
      .from("bookings")
      .select("id, trainee_id, class_slots(title, start_time)")
      .eq("status", "confirmed")
      .gte("class_slots.start_time", twoDaysMinus1h.toISOString())
      .lte("class_slots.start_time", twoDaysFromNow.toISOString());

    const validBookings = (upcomingBookings || []).filter(
      (b: any) => b.class_slots !== null
    );

    for (const booking of validBookings) {
      const slot = (booking as any).class_slots;
      // Check if we already sent a reminder for this booking
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", (booking as any).trainee_id)
        .eq("type", "booking_reminder")
        .eq("reference_id", (booking as any).id)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const startDate = new Date(slot.start_time);
      const dateStr = startDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const timeStr = startDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      await supabase.from("notifications").insert({
        user_id: (booking as any).trainee_id,
        type: "booking_reminder",
        reference_id: (booking as any).id,
        title: "Upcoming Session Reminder",
        message: `Your "${slot.title}" session is on ${dateStr} at ${timeStr}. Don't forget to prepare!`,
      });
      results.bookingReminders++;
    }

    // ── 2. Low credits warning (≤ 2 credits) ──
    const { data: lowCreditPkgs } = await supabase
      .from("trainee_packages")
      .select("id, trainee_id, remaining_credits, packages(name)")
      .eq("is_active", true)
      .lte("remaining_credits", 2);

    for (const pkg of lowCreditPkgs || []) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", (pkg as any).trainee_id)
        .eq("type", "low_credits")
        .eq("reference_id", (pkg as any).id)
        .gte(
          "created_at",
          new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        )
        .limit(1);

      if (existing && existing.length > 0) continue;

      const pkgName = (pkg as any).packages?.name || "your package";
      await supabase.from("notifications").insert({
        user_id: (pkg as any).trainee_id,
        type: "low_credits",
        reference_id: (pkg as any).id,
        title: "Low Credits Warning",
        message: `You have ${(pkg as any).remaining_credits} credit(s) remaining in "${pkgName}". Consider getting a new package to continue booking sessions.`,
      });
      results.lowCredits++;
    }

    // ── 3. Package expiry warning (7 days before) ──
    const sevenDaysFromNow = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000
    );
    const sixDaysFromNow = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);

    const { data: expiringPkgs } = await supabase
      .from("trainee_packages")
      .select("id, trainee_id, expires_at, packages(name)")
      .eq("is_active", true)
      .gte("expires_at", sixDaysFromNow.toISOString())
      .lte("expires_at", sevenDaysFromNow.toISOString());

    for (const pkg of expiringPkgs || []) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", (pkg as any).trainee_id)
        .eq("type", "package_expiry")
        .eq("reference_id", (pkg as any).id)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const expiryDate = new Date((pkg as any).expires_at).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" }
      );
      const pkgName = (pkg as any).packages?.name || "Your package";
      await supabase.from("notifications").insert({
        user_id: (pkg as any).trainee_id,
        type: "package_expiry",
        reference_id: (pkg as any).id,
        title: "Package Expiring Soon",
        message: `"${pkgName}" expires on ${expiryDate}. Make sure to use your remaining credits or renew your package.`,
      });
      results.expiryWarnings++;
    }

    // ── 4. Send email digests for new notifications ──
    // Collect all trainee IDs that got new notifications
    const notifiedTraineeIds = new Set<string>();
    for (const b of validBookings) {
      notifiedTraineeIds.add((b as any).trainee_id);
    }
    for (const p of lowCreditPkgs || []) {
      notifiedTraineeIds.add((p as any).trainee_id);
    }
    for (const p of expiringPkgs || []) {
      notifiedTraineeIds.add((p as any).trainee_id);
    }

    // Get emails for notified trainees and send simple email
    if (notifiedTraineeIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", Array.from(notifiedTraineeIds));

      for (const profile of profiles || []) {
        // Fetch unread notifications for this user
        const { data: unread } = await supabase
          .from("notifications")
          .select("title, message")
          .eq("user_id", profile.user_id)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!unread || unread.length === 0) continue;

        const notifList = unread
          .map((n: any) => `• ${n.title}: ${n.message}`)
          .join("\n");

        // Use Supabase's built-in email via auth admin (send a magic link with context)
        // For now, log the email content - actual email sending depends on email provider setup
        console.log(
          `[Email] To: ${profile.email} (${profile.full_name})\n${notifList}`
        );
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Reminder error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
