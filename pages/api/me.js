// pages/api/me.js
import { createClient } from "@supabase/supabase-js";

function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const parts = raw.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(name + "=")) return p.slice(name.length + 1);
  }
  return "";
}

// 兼容多种 Supabase cookie 形式：
// 1) sb-<projectref>-auth-token = URL-encoded JSON like ["access","refresh"] 或 {"access_token":...}
// 2) sb-access-token / sb-refresh-token (旧格式)
function extractAccessTokenFromCookies(req) {
  const raw = req.headers.cookie || "";
  if (!raw) return "";

  // 先找新格式 sb-xxx-auth-token
  const cookies = raw.split(";").map((p) => p.trim());
  const authTokenCookie = cookies.find(
    (c) => c.startsWith("sb-") && c.includes("-auth-token=")
  );

  if (authTokenCookie) {
    const [, value] = authTokenCookie.split("=");
    try {
      const decoded = decodeURIComponent(value);

      // 可能是 ["access","refresh"]
      if (decoded.startsWith("[")) {
        const arr = JSON.parse(decoded);
        if (Array.isArray(arr) && typeof arr[0] === "string") return arr[0];
      }

      // 可能是 {"access_token":"..."}
      if (decoded.startsWith("{")) {
        const obj = JSON.parse(decoded);
        if (obj?.access_token) return obj.access_token;
      }
    } catch (_) {
      // ignore
    }
  }

  // 再兼容旧格式
  const access = getCookie(req, "sb-access-token");
  if (access) return access;

  return "";
}

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return res.status(500).json({
        error: "Missing env NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
      });
    }

    const supabase = createClient(supabaseUrl, anonKey);

    const accessToken = extractAccessTokenFromCookies(req);
    if (!accessToken) {
      return res.status(200).json({
        logged_in: false,
        is_member: false,
        ends_at: null,
        status: null,
        debug: { reason: "no_access_token_in_cookie" },
      });
    }

    // 用 access_token 验证当前用户
    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
    const user = userData?.user;

    if (userErr || !user) {
      return res.status(200).json({
        logged_in: false,
        is_member: false,
        ends_at: null,
        status: null,
        debug: { reason: "getUser_failed", message: userErr?.message || "no user" },
      });
    }

    // 查会员订阅（你现在的规则：subscriptions 表里 status=active 且 ends_at>now）
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("status, ends_at")
      .eq("user_id", user.id)
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subErr) {
      return res.status(200).json({
        logged_in: true,
        is_member: false,
        ends_at: null,
        status: null,
        email: user.email,
        user_id: user.id,
        debug: { reason: "subscription_query_failed", message: subErr.message },
      });
    }

    const endsAt = sub?.ends_at ? new Date(sub.ends_at).getTime() : 0;
    const isActive = sub?.status === "active" && endsAt > Date.now();

    return res.status(200).json({
      logged_in: true,
      is_member: Boolean(isActive),
      ends_at: sub?.ends_at || null,
      status: sub?.status || null,
      email: user.email,
      user_id: user.id,
      debug: { cookie_mode: "manual_parse_auth_token" },
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
