import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// ✅ 后端用 service role 查 subscriptions（不受 RLS 影响）
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAnon = createClient(supabaseUrl, anonKey);
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export default async function handler(req, res) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(200).json({
        logged_in: false,
        is_member: false,
        ends_at: null,
        status: null,
        debug: { reason: "missing_bearer" },
      });
    }

    // 1) 用 token 拿到用户
    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(
      token
    );
    if (userErr || !userData?.user) {
      return res.status(200).json({
        logged_in: false,
        is_member: false,
        ends_at: null,
        status: null,
        debug: { reason: "getUser_failed", message: userErr?.message },
      });
    }

    const user = userData.user;

    // 2) 查 subscriptions（用 service role）
    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("status, plan, expires_at")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subErr) {
      return res.status(200).json({
        logged_in: true,
        email: user.email,
        user_id: user.id,
        is_member: false,
        ends_at: null,
        status: null,
        debug: { reason: "subscription_query_failed", message: subErr.message },
      });
    }

    const endsAt = sub?.expires_at || null;
    const isActive =
      !!endsAt &&
      new Date(endsAt).getTime() > Date.now() &&
      (sub?.status || "") === "active";

    return res.status(200).json({
      logged_in: true,
      email: user.email,
      user_id: user.id,
      is_member: isActive,
      plan: sub?.plan || null,
      status: sub?.status || null,
      ends_at: endsAt, // ✅ 统一返回 ends_at（其实就是 expires_at）
    });
  } catch (e) {
    return res.status(500).json({ error: "me_failed", detail: String(e) });
  }
}
