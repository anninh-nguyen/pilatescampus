import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin using their JWT
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { emails } = await req.json();
    if (!Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: "No emails provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate and validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const uniqueEmails = [...new Set(emails.map((e: string) => e.trim().toLowerCase()).filter((e: string) => emailRegex.test(e)))];

    if (uniqueEmails.length === 0) {
      return new Response(JSON.stringify({ error: "No valid emails provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which emails already have accounts
    const { data: { users: existingUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const existingEmails = new Set((existingUsers || []).map((u) => u.email?.toLowerCase()));

    const alreadyExists: string[] = [];
    const invited: string[] = [];
    const failed: string[] = [];

    for (const email of uniqueEmails) {
      if (existingEmails.has(email)) {
        alreadyExists.push(email);
        continue;
      }

      const { error } = await adminClient.auth.admin.inviteUserByEmail(email);
      if (error) {
        failed.push(email);
      } else {
        invited.push(email);
      }
    }

    return new Response(
      JSON.stringify({ invited, alreadyExists, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
