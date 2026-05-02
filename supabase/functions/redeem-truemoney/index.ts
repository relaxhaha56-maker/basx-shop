// Redeem a TrueMoney Wallet gift voucher to the shop's phone and credit user wallet
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

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { voucher_url } = await req.json();
    if (!voucher_url || typeof voucher_url !== "string") throw new Error("missing_voucher_url");

    // Extract voucher code (8-35 alphanumeric) from URL
    const m = voucher_url.match(/v=([A-Za-z0-9]{8,40})/) || voucher_url.match(/([A-Za-z0-9]{8,40})$/);
    const code = m?.[1];
    if (!code) throw new Error("invalid_voucher_url");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: settings } = await admin.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (!settings?.truemoney_enabled) throw new Error("truemoney_disabled");
    const phone = (settings.truemoney_phone || "").replace(/[^0-9]/g, "");
    if (phone.length !== 10) throw new Error("shop_phone_invalid");

    // Check duplicate
    const { data: dupes } = await admin.from("topup_requests").select("id")
      .eq("topup_type", "truemoney").contains("verification_data", { code }).limit(1);
    if (dupes && dupes.length > 0) throw new Error("voucher_already_used");

    // Create pending request first
    const { data: pending, error: pErr } = await admin.from("topup_requests").insert({
      user_id: user.id, amount: 0, topup_type: "truemoney", voucher_url, status: "pending",
    }).select().single();
    if (pErr) throw pErr;

    // Redeem with TrueMoney public API
    const tmRes = await fetch(`https://gift.truemoney.com/campaign/vouchers/${code}/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: phone, voucher_hash: code }),
    });
    const tmData = await tmRes.json();

    if (tmData?.status?.code !== "SUCCESS") {
      const reason = tmData?.status?.message || "ไม่สามารถรับซองได้";
      await admin.from("topup_requests").update({
        status: "rejected", reviewed_at: new Date().toISOString(),
        verification_data: { code, error: tmData }
      }).eq("id", pending.id);
      throw new Error(reason);
    }

    const amount = Number(tmData?.data?.my_ticket?.amount_baht || tmData?.data?.voucher?.amount_baht || 0);
    if (amount <= 0) throw new Error("zero_amount");

    await admin.from("topup_requests").update({ amount }).eq("id", pending.id);
    await admin.rpc("credit_wallet", {
      _user_id: user.id, _amount: amount, _topup_id: pending.id,
      _verification: { code, amount, raw: tmData?.data }
    });

    return new Response(JSON.stringify({ ok: true, amount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("redeem-truemoney error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message || "error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
