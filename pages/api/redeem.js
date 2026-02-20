// pages/api/redeem.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const supabase = createPagesServerClient({ req, res });

    // 1) 必须先拿到当前登录用户（从 cookie 读）
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return res.status(401).json({
        error: "not_logged_in",
        detail: userErr?.message || "No user session",
      });
    }

    // 2) 取兑换码
    const code = String(req.body?.code || "").trim();
    if (!code) return res.status(400).json({ error: "missing_code" });

    // 3) 查兑换码（你的表：public.redeem_codes）
    const { data: rc, error: rcErr } = await supabase
      .from("redeem_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (rcErr) return res.status(500).json({ error: "redeem_code_query_failed", detail: rcErr.message });
    if (!rc) return res.status(400).json({ error: "invalid_code" });

    // 已使用/过期（按你的表字段来）
    if (rc.used_at) return res.status(400).json({ error: "code_already_used" });
    if (rc.expires_at && new Date(rc.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "code_expired" });
    }

    // 4) 算到期时间（支持 days / months / years 三种）
    // 你的 redeem_codes 表最好有：duration_days / duration_months / duration_years / plan
    const now = new Date();
    let ends = new Date(now);

    const dDays = Number(rc.duration_days || 0);
    const dMonths = Number(rc.duration_months || 0);
    const dYears = Number(rc.duration_years || 0);

    if (dYears) ends.setFullYear(ends.getFullYear() + dYears);
    if (dMonths) ends.setMonth(ends.getMonth() + dMonths);
    if (dDays) ends.setDate(ends.getDate() + dDays);

    // 兜底：如果你只有一个字段比如 duration_days，就至少要 >0
    if (!dDays && !dMonths && !dYears) {
      // 如果你暂时没做字段，就先默认 30 天，避免 ends_at 为空
      ends.setDate(ends.getDate() + 30);
    }

    // 5) upsert subscriptions（关键：user_id = user.id）
    const { error: subErr } = await supabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        status: "active",
        ends_at: ends.toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (subErr) {
      return res.status(500).json({ error: "subscription_upsert_failed", detail: subErr.message });
    }

    // 6) 标记兑换码已使用（可选但推荐）
    const { error: usedErr } = await supabase
      .from("redeem_codes")
      .update({ used_at: new Date().toISOString(), used_by: user.id })
      .eq("id", rc.id);

    if (usedErr) {
      // 不阻断主流程，但返回提示
      return res.status(200).json({
        ok: true,
        warning: "redeem_ok_but_mark_used_failed",
        detail: usedErr.message,
        ends_at: ends.toISOString(),
      });
    }

    return res.status(200).json({
      ok: true,
      status: "active",
      ends_at: ends.toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e?.message || e) });
  }
}
