// pages/api/me.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    const supabase = createPagesServerClient({ req, res });

    // 1) 优先：如果有 Authorization: Bearer xxx，就用它
    const auth = req.headers.authorization || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    let user = null;
    let mode = "cookie";

    if (m?.[1]) {
      const token = m[1].trim();
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        return res.status(200).json({
          logged_in: false,
          is_member: false,
          ends_at: null,
          status: null,
          debug: { reason: "bearer_getUser_failed", message: error.message },
        });
      }
      user = data?.user || null;
      mode = "bearer";
    } else {
      // 2) 否则：走 cookie session
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        return res.status(200).json({
          logged_in: false,
          is_member: false,
          ends_at: null,
          status: null,
          debug: { reason: "cookie_getUser_failed", message: error.message },
        });
      }
      user = data?.user || null;
    }

    if (!user) {
      return res.status(200).json({
        logged_in: false,
        is_member: false,
        ends_at: null,
        status: null,
        debug: { reason: "no_user", mode },
      });
    }

    // 3) 查会员（subscriptions）
    // 你们之前 redeem 已经能写入 subscriptions 并算出 expires_at
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("status,expires_at,plan")
      .eq("user_id", user.id)
      .not("ends_at", "is", null)
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
        debug: { reason: "subscription_query_failed", message: subErr.message, mode },
      });
    }

    const now = Date.now();
    const endsAt = sub?.expires_at ? new Date(sub.expires_at).getTime() : null;
    const isActive =
      sub?.status === "active" && endsAt && endsAt > now;

    return res.status(200).json({
      logged_in: true,
      email: user.email,
      user_id: user.id,
      is_member: Boolean(isActive),
      plan: sub?.plan || null,
      ends_at: sub?.expires_at || null,
      status: sub?.status || null,
      debug: { mode },
    });
  } catch (e) {
    return res.status(500).json({ error: "api_me_failed", detail: String(e) });
  }
}
