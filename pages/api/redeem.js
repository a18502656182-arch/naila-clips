// pages/api/redeem.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 兜底：从 Cookie 里拿 sb-xxx-auth-token
function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const parts = raw.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(name + "=")) return decodeURIComponent(p.slice(name.length + 1));
  }
  return "";
}

function parseSupabaseAuthTokenFromCookie(req) {
  const raw = req.headers.cookie || "";
  const m = raw.match(/sb-[^=]+-auth-token=([^;]+)/);
  if (!m) return null;

  const val = decodeURIComponent(m[1]);
  try {
    // 通常是 JSON 数组字符串：["access_token","refresh_token",...]
    const arr = JSON.parse(val);
    if (Array.isArray(arr) && arr[0]) return arr[0];
  } catch {}

  // 有些情况下可能是 base64 或别的格式，这里就不硬解析了
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  // 1) 读取兑换码
  const code = String(req.body?.code || "").trim();
  if (!code) return res.status(400).json({ error: "missing_code" });

  // 2) 必须登录：从 cookie 拿 access_token，去 supabase 验证用户
  const accessToken = parseSupabaseAuthTokenFromCookie(req);
  if (!accessToken) {
    return res.status(401).json({ error: "not_logged_in" });
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  const user = userData?.user;
  if (userErr || !user) {
    return res.status(401).json({ error: "invalid_session", detail: userErr?.message });
  }

  // 3) 固定码校验（你可以改成多个码，或者后面接 redeem_codes 表）
  const VALID_CODE = "VIPTEST"; // ✅ 你要的固定测试码
  if (code !== VALID_CODE) {
    return res.status(400).json({ error: "invalid_code" });
  }

  // 4) 写入 subscriptions：给 30 天会员
  const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // 这里用 upsert：同一个 user_id 反复兑换会刷新到期时间（测试方便）
  const { error: upErr } = await supabase
    .from("subscriptions")
    .upsert(
      { user_id: user.id, status: "active", ends_at: endsAt },
      { onConflict: "user_id" }
    );

  if (upErr) {
    return res.status(500).json({ error: "db_upsert_failed", detail: upErr.message });
  }

  return res.json({
    ok: true,
    user_id: user.id,
    email: user.email,
    status: "active",
    ends_at: endsAt,
  });
}
