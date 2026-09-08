// Admin-only: ask the external key-generator site to create keys, then store them here.
// POST { product_id: uuid, count: number, add_to_stock: boolean }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const productId = String(body?.product_id ?? "");
    const count = Number(body?.count ?? 0);
    const addToStock = body?.add_to_stock !== false;
    if (!productId) return json({ error: "product_id_required" }, 400);
    if (!Number.isInteger(count) || count < 1 || count > 100) return json({ error: "count_out_of_range" }, 400);

    const { data: prod } = await admin.from("products").select("id, name").eq("id", productId).maybeSingle();
    if (!prod) return json({ error: "product_not_found" }, 400);

    const keygenUrl = Deno.env.get("KEYGEN_URL");
    const keygenKey = Deno.env.get("KEYGEN_API_KEY");
    if (!keygenUrl || !keygenKey) return json({ error: "keygen_not_configured" }, 400);

    const res = await fetch(keygenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": keygenKey },
      body: JSON.stringify({ product_name: prod.name, product_id: prod.id, count }),
    });
    const text = await res.text();
    if (!res.ok) return json({ error: "keygen_failed", status: res.status, detail: text.slice(0, 500) }, 502);

    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { return json({ error: "keygen_bad_response", detail: text.slice(0, 300) }, 502); }

    const raw = parsed?.keys ?? parsed?.data ?? [];
    const keys = (Array.isArray(raw) ? raw : []).map((k: any) =>
      typeof k === "string" ? { key: k, link: null } : { key: k?.key ?? null, link: k?.link ?? null }
    ).filter((k: any) => k.key || k.link);
    if (keys.length === 0) return json({ error: "keygen_returned_no_keys" }, 502);

    if (addToStock) {
      const { error } = await admin.from("product_stock").insert(
        keys.map((k: any) => ({ product_id: prod.id, key_value: k.key, link_value: k.link, sold: false }))
      );
      if (error) return json({ error: error.message }, 400);
    } else {
      const { error } = await admin.from("key_inbox").insert(
        keys.map((k: any) => ({
          product_id: prod.id, product_hint: prod.name, key_value: k.key, link_value: k.link,
          source: "admin_generate", status: "pending",
        }))
      );
      if (error) return json({ error: error.message }, 400);
    }

    await admin.from("admin_audit_log").insert({
      actor_id: uid, action: "generate_keys", target_id: prod.id,
      details: { count: keys.length, add_to_stock: addToStock },
    });

    return json({ ok: true, generated: keys.length, added_to_stock: addToStock });
  } catch (e: any) {
    console.error("generate-keys error", e);
    return json({ error: e?.message ?? "error" }, 500);
  }
});
