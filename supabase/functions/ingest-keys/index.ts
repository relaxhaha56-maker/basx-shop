// Receive keys from an external key-generator site.
// POST /functions/v1/ingest-keys
// Headers: x-api-key: <SHOP_STOCK_API_KEY>
// Body: { product_id?: uuid, product_name?: string, keys: [{key?: string, link?: string}] | string[], add_to_stock: boolean, note?: string, source?: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const expected = Deno.env.get("SHOP_STOCK_API_KEY");
    if (!expected) throw new Error("server_not_configured");
    const provided = req.headers.get("x-api-key") || "";
    if (provided !== expected) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { product_id, product_name, keys, add_to_stock, note, source } = body ?? {};

    if (!Array.isArray(keys) || keys.length === 0) throw new Error("keys_required");
    if (keys.length > 500) throw new Error("too_many_keys");

    const norm = keys.map((k: any) => {
      if (typeof k === "string") return { key: k, link: null };
      return { key: k?.key ?? null, link: k?.link ?? null };
    }).filter((k) => k.key || k.link);
    if (norm.length === 0) throw new Error("empty_keys");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Resolve product by id or exact name
    let pid: string | null = null;
    if (product_id) {
      const { data } = await admin.from("products").select("id").eq("id", product_id).maybeSingle();
      pid = data?.id ?? null;
    } else if (product_name) {
      const { data } = await admin.from("products").select("id").eq("name", product_name).maybeSingle();
      pid = data?.id ?? null;
    }

    if (add_to_stock === true) {
      if (!pid) throw new Error("product_not_found");
      const rows = norm.map((k) => ({ product_id: pid, key_value: k.key, link_value: k.link, sold: false }));
      const { error } = await admin.from("product_stock").insert(rows);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, added_to_stock: rows.length }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    } else {
      const rows = norm.map((k) => ({
        product_id: pid, product_hint: product_name ?? null,
        key_value: k.key, link_value: k.link, note: note ?? null, source: source ?? null, status: "pending",
      }));
      const { error } = await admin.from("key_inbox").insert(rows);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, saved_to_inbox: rows.length }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }
  } catch (e: any) {
    console.error("ingest-keys error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message || "error" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
