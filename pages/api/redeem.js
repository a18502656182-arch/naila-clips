// pages/api/redeem.js
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

// ✅ 核心逻辑：如果已有未过期的会员，从现有到期时间往后加；否则从现在算起
function calcNewExpiry(existingExpiresAt, days) {
  const d = Number(days || 0);
  const safeDays = Number.isFinite(d) && d > 0 ? d : 30;
  const msToAdd = safeDays * 24 * 60 * 60 * 1000;

  if (existingExpiresAt) {
    const existing = new Date(existingExpiresAt).getTime();
    if (Number.isFinite(existing) && existing > Date.now()) {
      // 现有会员未过期：在现有到期时间基础上续期
      return new Date(existing + msToAdd).toISOString();
    }
  }
  // 无会员或已过期：从现在算起
  return new Date(Date.now() + msToAdd).toISOString();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  try {
    const code = (req.body?.code || "").trim();
    if (!code) return res.status(400).json({ error: "missing_code" });

    // 用和 /api/me 一样的方式读取登录用户
    const supabase = createServerSupabaseClient({ req, res });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user?.id) {
      return res.status(401).json({ error: "not_logged_in" });
    }
    const user_id = user.id;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 查兑换码
    const { data: rc, error: rcErr } = await admin
      .from("redeem_codes")
      .select("code, plan, days, max_uses, used_count, expires_at, is_active")
      .eq("code", code)
      .maybeSingle();

    if (rcErr) return res.status(500).json({ error: "db_read_failed", detail: rcErr.message });
    if (!rc || !rc.is_active) return res.status(400).json({ error: "invalid_code" });

    if (rc.expires_at) {
      const exp = new Date(rc.expires_at).getTime();
      if (Number.isFinite(exp) && exp < Date.now()) return res.status(400).json({ error: "code_expired" });
    }

    const used = Number(rc.used_count || 0);
    const max = Number(rc.max_uses || 0);
    if (max > 0 && used >= max) return res.status(400).json({ error: "code_used_up" });

    // ✅ 查现有订阅，判断是否需要续期（而不是覆盖）
    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("expires_at, status")
      .eq("user_id", user_id)
      .maybeSingle();

    const existingExpiry = existingSub?.expires_at || null;

    // 计算新到期时间：续期叠加，而不是覆盖
    const new_expires_at = calcNewExpiry(existingExpiry, rc.days);

    // 写入 subscriptions
    const { error: subErr } = await admin
      .from("subscriptions")
      .upsert(
        { user_id, status: "active", plan: rc.plan || "month", expires_at: new_expires_at },
        { onConflict: "user_id" }
      );

    if (subErr) return res.status(500).json({ error: "subscription_upsert_failed", detail: subErr.message });

    // used_count +1
    const { error: incErr } = await admin
      .from("redeem_codes")
      .update({ used_count: used + 1 })
      .eq("code", code);

    if (incErr) return res.status(500).json({ error: "update_used_count_failed", detail: incErr.message });

    return res.status(200).json({ ok: true, user_id, plan: rc.plan || "month", expires_at: new_expires_at });

  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e?.message || e) });
  }
}
