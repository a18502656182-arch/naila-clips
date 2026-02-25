// pages/api/redeem.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 1) 用于校验用户身份（用 access_token 去 getUser）
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2) 用于绕过 RLS 写表（一定要用 Service Role）
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 从 cookie 里捞出 sb-xxx-auth-token（你现在 /api/me 已经能读到这个）
function getAccessTokenFromCookie(req) {
  const cookie = req.headers.cookie || "";
  // 匹配形如：sb-xxxx-auth-token=xxxxx
  const m = cookie.match(/sb-[^=]+-auth-token=([^;]+)/);
  if (!m) return "";

  try {
    const raw = decodeURIComponent(m[1]);
    // supabase cookie 一般是 json 字符串（包含 access_token）
    const obj = JSON.parse(raw);
    return obj?.access_token || "";
  } catch (e) {
    return "";
  }
}

function daysToExpireAt(days) {
  const d = Number(days || 0);
  // 默认给 30 天兜底，避免 days 为空导致 null
  const safeDays = Number.isFinite(d) && d > 0 ? d : 30;
  return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000).toISOString();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "missing_env",
        detail:
          "请在 Vercel Project Settings → Environment Variables 配好 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const code = (req.body?.code || "").trim();
    if (!code) return res.status(400).json({ error: "missing_code" });

    // 1) 取登录用户（从 cookie 拿 access_token）
    const auth = req.headers.authorization || "";
const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
const token = bearer || getAccessTokenFromCookie(req);

if (!token) return res.status(401).json({ error: "not_logged_in" });

    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return res.status(401).json({ error: "invalid_session", detail: userErr?.message || "no_user" });
    }
    const user_id = userData.user.id;

    // 2) 查兑换码（必须存在、激活、未过期、未用完次数）
    const { data: rc, error: rcErr } = await supabaseAdmin
      .from("redeem_codes")
      .select("code, plan, days, max_uses, used_count, expires_at, is_active")
      .eq("code", code)
      .maybeSingle();

    if (rcErr) return res.status(500).json({ error: "db_read_failed", detail: rcErr.message });
    if (!rc || !rc.is_active) return res.status(400).json({ error: "invalid_code" });

    // 过期校验（redeem_codes.expires_at 如果有值就校验）
    if (rc.expires_at) {
      const exp = new Date(rc.expires_at).getTime();
      if (Number.isFinite(exp) && exp < Date.now()) return res.status(400).json({ error: "code_expired" });
    }

    const used = Number(rc.used_count || 0);
    const max = Number(rc.max_uses || 0);
    if (max > 0 && used >= max) return res.status(400).json({ error: "code_used_up" });

    // 3) 计算订阅到期时间（关键：subscriptions.expires_at 不能为 null）
    const expires_at = daysToExpireAt(rc.days);

    // 4) 写入 subscriptions（用 admin client 绕过 RLS）
    // 你 /api/me 返回有 status/ends_at，但你表现在报错是 expires_at，所以这里写 expires_at
    const { error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id,
          status: "active",
          plan: rc.plan || "month",
          expires_at,
        },
        { onConflict: "user_id" }
      );

    if (subErr) {
      return res.status(500).json({
        error: "subscription_upsert_failed",
        detail: subErr.message,
      });
    }

    // 5) used_count +1
    const { error: incErr } = await supabaseAdmin
      .from("redeem_codes")
      .update({ used_count: used + 1 })
      .eq("code", code);

    if (incErr) return res.status(500).json({ error: "update_used_count_failed", detail: incErr.message });

    return res.status(200).json({
      ok: true,
      user_id,
      plan: rc.plan || "month",
      expires_at,
    });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e?.message || e) });
  }
}
