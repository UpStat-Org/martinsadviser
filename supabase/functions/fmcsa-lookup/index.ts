import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Agent, fetch as undiciFetch } from "npm:undici@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      throw new Error("Not authenticated");
    }

    const { dot_number } = await req.json();
    if (!dot_number) throw new Error("DOT number is required");

    const webKey = Deno.env.get("FMCSA_WEB_KEY");
    if (!webKey) throw new Error("FMCSA_WEB_KEY not configured");

    // Call FMCSA QC API using undici with TLS verification disabled
    const apiUrl = `https://mobile.fmcsa.dot.gov/qc/services/carriers/${dot_number}?webKey=${webKey}`;
    
    const agent = new Agent({
      connect: {
        rejectUnauthorized: false,
      },
    });

    const response = await undiciFetch(apiUrl, {
      headers: { Accept: "application/json" },
      dispatcher: agent,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`FMCSA API error [${response.status}]: ${text}`);
    }

    const data = await response.json();
    const carrier = (data as any)?.content?.carrier;

    if (!carrier) {
      throw new Error("Carrier not found for DOT " + dot_number);
    }

    // Extract relevant fields
    const result = {
      company_name: carrier.legalName || carrier.dbaName || "",
      phone: carrier.phyPhone || "",
      address: [
        carrier.phyStreet,
        carrier.phyCity,
        carrier.phyState,
        carrier.phyZipcode,
      ]
        .filter(Boolean)
        .join(", "),
      mc: carrier.mcNumber || "",
      ein: carrier.ein || "",
      dot: String(carrier.dotNumber || dot_number),
      totalDrivers: carrier.totalDrivers || 0,
      totalPowerUnits: carrier.totalPowerUnits || 0,
      carrierOperation: carrier.carrierOperation?.carrierOperationDesc || "",
      safetyRating: carrier.safetyRating || "",
      statusCode: carrier.statusCode || "",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("FMCSA lookup error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
