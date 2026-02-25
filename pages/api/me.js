// pages/api/me.js
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

function setNoStore(res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

async function getMembership(supabase, userId) {
  const now = Date.now();

  // 先尝试 ends_at；如果列不存在再尝试 expires_at
  const tryQuery = async (dateCol) => {
    const { data, error } = await supabase
      .from("subscriptions")
      .select(`status, plan, ${dateCol}`)
      .eq("user_id", userId)
      .order(dateCol, { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    return { data, error, dateCol };
  };

  let r = await tryQuery("ends_at");
  if (r.error && String(r.error.message || "").toLowerCase().includes("column") && String(r.error.message || "").includes("ends_at")) {
    r = await tryQuery("expires_at");
  }

  if (r.error) {
    return {
      is_member: false,
      plan: null,
      status: null,
      end_at: null,
      debug: { ok: false, reason: "query_error", message: r.error.message, used: r.dateCol },
    };
  }

  const sub = r.data;
  if (!sub) {
    return {
      is_member: false,
      plan: null,
      status: null,
      end_at: null,
      debug: { ok: false, reason: "no_subscription_row", used: r.dateCol },
    };
  }

  const status = sub.status ?? null;
  const plan = sub.plan ?? null;
  const end_at = sub[r.dateCol] ?? null;

  // ✅ 规则：status=active 且 (end_at 为空 => 视为长期有效) 或 (end_at > now)
  let is_member = false;
  if (status === "active") {
    if (!end_at) {
      is_member = true;
    } else {
      const endMs = new Date(end_at).getTime();
      if (!Number.isNaN(endMs) && endMs > now) is_member = true;
    }
  }

  return {
    is_member,
    plan,
    status,
    end_at,
    debug: { ok: true, used: r.dateCol, raw: { status, plan, end_at } },
  };
}

export default async function handler(req, res) {
  setNoStore(res);

  try {
    const supabase = createServerSupabaseClient({ req, res });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return res.status(200).json({
        logged_in: false,
        is_member: false,
        debug: { mode: "no_user", userErr: userErr?.message || null },
      });
    }

    const m = await getMembership(supabase, user.id);

    return res.status(200).json({
      logged_in: true,
      email: user.email,
      user_id: user.id,
      is_member: m.is_member,
      plan: m.plan,
      status: m.status,
      ends_at: m.end_at, // 统一输出到 ends_at 字段（不管底层用 ends_at 还是 expires_at）
      debug: { mode: "cookie", membership: m.debug },
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
