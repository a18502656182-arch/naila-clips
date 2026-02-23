// pages/api/me.js
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

function setNoStore(res) {
  // ✅ 彻底禁用缓存：浏览器/CDN/代理都不缓存
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
}

export default async function handler(req, res) {
  setNoStore(res);

  try {
    // 1) 用 cookie session 判断是否登录
    const supabase = createServerSupabaseClient({ req, res });
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) {
      return res.status(200).json({
        logged_in: false,
        is_member: false,
        email: null,
        user_id: null,
        debug: { mode: "cookie", error: sessionErr.message },
      });
    }

    const user = session?.user;
    if (!user) {
      return res.status(200).json({
        logged_in: false,
        is_member: false,
        email: null,
        user_id: null,
        debug: { mode: "cookie" },
      });
    }

    // 2) 用 Service Role 查询 subscriptions（不依赖 RLS）
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      // 环境变量缺失也别 500，避免前端误判（但会带 debug）
      return res.status(200).json({
        logged_in: true,
        email: user.email || null,
        user_id: user.id,
        is_member: false,
        plan: null,
        ends_at: null,
        status: null,
        debug: { mode: "cookie", warn: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: sub, error: subErr } = await admin
      .from("subscriptions")
      .select("plan, ends_at, status")
      .eq("user_id", user.id)
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let is_member = false;
    let plan = sub?.plan ?? null;
    let ends_at = sub?.ends_at ?? null;
    let status = sub?.status ?? null;

    if (!subErr && sub?.status === "active" && sub?.ends_at) {
      const now = Date.now();
      const endMs = new Date(sub.ends_at).getTime();
      if (Number.isFinite(endMs) && endMs > now) is_member = true;
    }

    return res.status(200).json({
      logged_in: true,
      email: user.email || null,
      user_id: user.id,
      is_member,
      plan,
      ends_at,
      status,
      debug: { mode: "cookie" },
    });
  } catch (e) {
    return res.status(200).json({
      logged_in: false,
      is_member: false,
      email: null,
      user_id: null,
      debug: { mode: "cookie", error: e?.message || "unknown" },
    });
  }
}
