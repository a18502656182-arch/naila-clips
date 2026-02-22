// pages/api/me.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    const supabase = createPagesServerClient({ req, res });

    // 1) 优先 Bearer（你控制台手动测接口时用）
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
      // 2) 否则走 cookie session（正常网页访问就是这个）
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

    // 3) 查会员：统一用 subscriptions.ends_at
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("status, ends_at, plan")
      .eq("user_id", user.id)
      .not("ends_at", "is", null) // ✅ 过滤掉 ends_at=null 的脏行
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subErr) {
      return res.status(200).json({
        logged_in: true,
        email: user.email,
        user_id: user.id,
        is_member: false,
        plan: null,
        ends_at: null,
        status: null,
        debug: { reason: "subscription_query_failed", message: subErr.message, mode },
      });
    }

    const now = Date.now();
    const endsAtMs = sub?.ends_at ? new Date(sub.ends_at).getTime() : null;
    const isActive = sub?.status === "active" && endsAtMs && endsAtMs > now;

    return res.status(200).json({
      logged_in: true,
      email: user.email,
      user_id: user.id,
      is_member: Boolean(isActive),
      plan: sub?.plan || null,
      ends_at: sub?.ends_at || null,
      status: sub?.status || null,
      debug: { mode },
    });
  } catch (e) {
    return res.status(500).json({ error: "api_me_failed", detail: String(e) });
  }
}
