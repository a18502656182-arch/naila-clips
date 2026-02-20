// pages/api/me.js
import { createClient } from "@supabase/supabase-js";

function getBearer(req) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : "";
}

export default async function handler(req, res) {
  try {
    const SUPABASE_URL =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY =
      process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({
        logged_in: false,
        is_member: false,
        ends_at: null,
        status: null,
        debug: { reason: "missing_env" },
      });
    }

    // ✅ 只用 Bearer（你现在就是要用它验证）
    const token = getBearer(req);
    if (!token) {
      return res.status(200).json({
        logged_in: false,
        is_member: false,
        ends_at: null,
        status: null,
        debug: { reason: "no_bearer" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ✅ 用 token 解析用户
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(200).json({
        logged_in: false,
        is_member: false,
        ends_at: null,
        status: null,
        debug: { reason: "getUser_failed", message: userErr?.message || "no user" },
      });
    }

    const user = userData.user;

    // ✅ 查订阅（你 redeem 成功后应该有一条 subscriptions）
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("status, ends_at")
      .eq("user_id", user.id)
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

    const endsAt = sub?.ends_at || null;
    const status = sub?.status || null;

    const isMember =
      status === "active" && endsAt && new Date(endsAt).getTime() > Date.now();

    return res.status(200).json({
      logged_in: true,
      is_member: isMember,
      ends_at: endsAt,
      status,
      email: user.email,
      user_id: user.id,
      debug: { mode: "bearer_only" },
    });
  } catch (e) {
    return res.status(500).json({
      logged_in: false,
      is_member: false,
      ends_at: null,
      status: null,
      debug: { reason: "server_error", message: String(e?.message || e) },
    });
  }
}
