import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if admin user already exists
    const { data: existingProfiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("username", "luis.1");

    if (existingProfiles && existingProfiles.length > 0) {
      return new Response(JSON.stringify({ message: "Admin user already exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: "luis.1@stockbox.app",
      password: "123@",
      email_confirm: true,
      user_metadata: { username: "luis.1", full_name: "Administrador" },
    });

    if (authError) throw authError;

    // Assign admin role
    await supabaseAdmin.from("user_roles").insert({
      user_id: authData.user.id,
      role: "admin",
    });

    return new Response(JSON.stringify({ message: "Admin user created", email: "luis.1@stockbox.app" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
