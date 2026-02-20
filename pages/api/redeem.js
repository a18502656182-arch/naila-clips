import { createClient } from "@supabase/supabase-js";

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default async function handler(req, res) {
  // ✅ 明确允许 POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRole) {
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" });
    }

    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Missing Bearer token" });

    const supabaseAdmin = createClient(supabaseUrl, serviceRole);

    // 1) 用 token 换用户
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr) return res.status(401).json({ error: userErr.message });
    const user = userData?.user;
    if (!user) return res.status(401).json({ error: "Invalid token" });

    // 2) 取 code
    const { code } = req.body || {};
    const codeStr = String(code || "").trim().toUpperCase();
    if (!codeStr) return res.status(400).json({ error: "Missing code" });

    // 3) 查兑换码是否存在/可用
    const { data: rc, error: rcErr } = await supabaseAdmin
      .from("redeem_codes")
      .select("code, plan, days, max_uses, used_count, expires_at")
      .eq("code", codeStr)
      .maybeSingle();

    if (rcErr) throw rcErr;
    if (!rc) return res.status(400).json({ error: "Invalid code" });

    if (rc.expires_at && new Date(rc.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "Code expired" });
    }
    if (rc.max_uses != null && rc.used_count != null && rc.used_count >= rc.max_uses) {
      return res.status(400).json({ error: "Code used up" });
    }

    // 4) 写入 subscriptions（A方案：到期仍可登录，只是 is_member=false）
    const endsAt = addDays(new Date(), Number(rc.days || 30)).toISOString();

    // upsert：已有就更新到更晚（防止覆盖短的）
    const { data: subOld } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    let finalEndsAt = endsAt;
    if (subOld?.expires_at) {
      const oldT = new Date(subOld.expires_at).getTime();
      const newT = new Date(endsAt).getTime();
      finalEndsAt = new Date(Math.max(oldT, newT)).toISOString();
    }

    const { error: upErr } = await supabaseAdmin
      .from("subscriptions")
      .upsert({ user_id: user.id, expires_at: finalEndsAt }, { onConflict: "user_id" });

    if (upErr) throw upErr;

    // 5) 记录 redemption + used_count +1
    await supabaseAdmin.from("code_redemptions").insert({
      code: codeStr,
      user_id: user.id,
      redeemed_at: new Date().toISOString(),
    });

    await supabaseAdmin
      .from("redeem_codes")
      .update({ used_count: (rc.used_count || 0) + 1 })
      .eq("code", codeStr);

    return res.status(200).json({ ok: true, ends_at: finalEndsAt });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown server error" });
  }
}
