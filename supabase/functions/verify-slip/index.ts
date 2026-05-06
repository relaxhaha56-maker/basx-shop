// Verify a bank slip via EasySlip API and credit user's wallet on success
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const EASYSLIP_API_KEY = Deno.env.get("EASYSLIP_API_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { topup_id } = await req.json();
    if (!topup_id) throw new Error("missing_topup_id");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load topup
    const { data: topup, error: tErr } = await admin.from("topup_requests").select("*").eq("id", topup_id).maybeSingle();
    if (tErr || !topup) throw new Error("topup_not_found");
    if (topup.user_id !== user.id) throw new Error("forbidden");
    if (topup.status !== "pending") throw new Error("already_processed");
    if (!topup.slip_url) throw new Error("no_slip");

    // Get site settings (verify settings)
    const { data: settings } = await admin.from("site_settings").select("*").eq("id", 1).maybeSingle();
    const { data: priv } = await admin.from("private_settings").select("*").eq("id", 1).maybeSingle();
    if (!settings?.easyslip_enabled) {
      // Auto-verify disabled — keep pending for manual review
      return new Response(JSON.stringify({ ok: true, status: "pending", message: "ส่งให้แอดมินตรวจสอบแล้ว" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!EASYSLIP_API_KEY) throw new Error("easyslip_not_configured");

    // Get signed URL for EasySlip to access the slip
    const filePath = topup.slip_url; // stored as path within bucket
    const { data: signed } = await admin.storage.from("slips").createSignedUrl(filePath, 300);
    if (!signed?.signedUrl) throw new Error("cannot_sign_slip");

    // Call EasySlip
    const esRes = await fetch("https://developer.easyslip.com/api/v1/verify", {
      method: "POST",
      headers: { "Authorization": `Bearer ${EASYSLIP_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: signed.signedUrl }),
    });
    const esData = await esRes.json();

    if (!esRes.ok || esData.status !== 200) {
      return new Response(JSON.stringify({ ok: false, status: "pending", message: "ตรวจสอบสลิปไม่สำเร็จ ส่งให้แอดมินตรวจสอบ", detail: esData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = esData.data;
    const slipAmount = Number(data?.amount?.amount ?? data?.amount ?? 0);
    const receiverName = String(data?.receiver?.account?.name?.th || data?.receiver?.account?.name?.en || "");
    const receiverNumber = String(data?.receiver?.account?.bank?.account || data?.receiver?.account?.proxy?.account || "");

    // Check duplicate slip ref
    const ref = data?.transRef || data?.ref;
    if (ref) {
      const { data: dupes } = await admin.from("topup_requests").select("id")
        .eq("status", "approved").contains("verification_data", { transRef: ref }).limit(1);
      if (dupes && dupes.length > 0) throw new Error("duplicate_slip");
    }

    // Match expected account
    const expectedName = (priv?.expected_account_name || "").trim();
    const expectedNumber = (priv?.expected_account_number || "").replace(/[^0-9]/g, "");
    const slipNumber = receiverNumber.replace(/[^0-9X]/gi, "");

    if (expectedName && !receiverName.includes(expectedName.split(" ")[0])) {
      return new Response(JSON.stringify({ ok: false, status: "pending", message: `ชื่อผู้รับไม่ตรง (ได้ ${receiverName}) ส่งให้แอดมินตรวจสอบ` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (expectedNumber && slipNumber.length > 0) {
      const last4exp = expectedNumber.slice(-4);
      const last4slip = slipNumber.replace(/X/gi, "").slice(-4);
      if (last4exp && last4slip && last4exp !== last4slip) {
        return new Response(JSON.stringify({ ok: false, status: "pending", message: "เลขบัญชีผู้รับไม่ตรง ส่งให้แอดมินตรวจสอบ" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Tolerance check on amount
    if (Math.abs(slipAmount - Number(topup.amount)) > 0.01) {
      return new Response(JSON.stringify({ ok: false, status: "pending", message: `จำนวนเงินไม่ตรง (สลิป ${slipAmount} / แจ้ง ${topup.amount})` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // All good — credit
    await admin.rpc("credit_wallet", {
      _user_id: user.id, _amount: slipAmount, _topup_id: topup_id,
      _verification: { transRef: ref, receiverName, receiverNumber, slipAmount, raw: data }
    });

    return new Response(JSON.stringify({ ok: true, status: "approved", amount: slipAmount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("verify-slip error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message || "error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
