// pages/api/me.js
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

function setNoStore(res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

async function getMembership(supabase, userId) {
  const now = Date.now();

  // ✅ 同时查两个字段，避免其中一个是 null 另一个有值的情况
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("status, plan, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !sub) {
    return { is_member: false, plan: null, status: null, end_at: null };
  }

  const status = sub.status ?? null;
  const plan = sub.plan ?? null;
  const end_at = sub.expires_at || null;

  let is_member = false;
  if (status === "active") {
    if (!end_at) {
      is_member = true; // 无到期时间视为永久有效
    } else {
      const endMs = new Date(end_at).getTime();
      if (!Number.isNaN(endMs) && endMs > now) is_member = true;
    }
  }

  return { is_member, plan, status, end_at };
}

export default async function handler(req, res) {
  setNoStore(res);

  try {
    const supabase = createServerSupabaseClient({ req, res });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user) {
      return res.status(200).json({ logged_in: false, is_member: false });
    }

    const m = await getMembership(supabase, user.id);

    return res.status(200).json({
      logged_in: true,
      email: user.email,
      user_id: user.id,
      is_member: m.is_member,
      plan: m.plan,
      status: m.status,
      ends_at: m.end_at, // 前端统一用 ends_at
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
