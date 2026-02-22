// pages/api/clip.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

function getBearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function getUserFromReq(req, res) {
  const supabase = createPagesServerClient({ req, res });

  const token = getBearer(req);
  const { data, error } = token
    ? await supabase.auth.getUser(token) // Bearer
    : await supabase.auth.getUser(); // Cookie

  const user = data?.user || null;
  return {
    supabase,
    user,
    mode: token ? "bearer" : "cookie",
    userErr: error?.message || null,
  };
}

async function getIsMember(supabase, userId) {
  if (!userId) return { is_member: false, plan: null, ends_at: null, status: null };

  const now = new Date().toISOString();

  // 取当前用户最新的一条有效订阅（expires_at > now 且 status=active）
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, expires_at, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", now)
    .order("expires_at", { ascending: false })
    .limit(1);

  if (error) {
    return { is_member: false, plan: null, ends_at: null, status: null, _err: error.message };
  }

  const row = data?.[0] || null;
  return {
    is_member: !!row,
    plan: row?.plan || null,
    ends_at: row?.expires_at || null,
    status: row?.status || null,
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "method_not_allowed" });
    }

    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ error: "missing_id" });

    const { supabase, user, mode, userErr } = await getUserFromReq(req, res);

    // ✅ 关键：clips_view 里不要 select can_access（它不是列）
    const { data: rows, error: e1 } = await supabase
      .from("clips_view")
      .select(
        "id,title,description,duration_sec,upload_time,access_tier,cover_url,video_url,created_at,difficulty_slugs,topic_slugs,channel_slugs"
      )
      .eq("id", id)
      .limit(1);

    if (e1) {
      return res.status(500).json({ error: "query_failed", detail: e1.message });
    }

    const clip = rows?.[0] || null;
    if (!clip) {
      return res.status(404).json({ error: "not_found" });
    }

    // 登录 + 会员判断
    const me = await getIsMember(supabase, user?.id);

    // ✅ API 计算 can_access（与你 /api/clips 的约定一致）
    // 规则：free 永远可看；vip 仅会员可看
    const accessTier = clip.access_tier || "free";
    const can_access = accessTier === "free" ? true : !!me.is_member;

    return res.status(200).json({
      ok: true,
      item: {
        id: clip.id,
        title: clip.title,
        description: clip.description,
        duration_sec: clip.duration_sec,
        upload_time: clip.upload_time,
        access_tier: clip.access_tier,
        cover_url: clip.cover_url,
        video_url: clip.video_url,
        created_at: clip.created_at,
        difficulty_slugs: clip.difficulty_slugs || [],
        topic_slugs: clip.topic_slugs || [],
        channel_slugs: clip.channel_slugs || [],
        can_access, // ✅ 这里给前端用
      },
      me: {
        logged_in: !!user,
        is_member: !!me.is_member,
        plan: me.plan,
        ends_at: me.ends_at,
        status: me.status,
      },
      debug: { mode, userErr },
    });
  } catch (err) {
    return res.status(500).json({ error: "unknown", detail: String(err?.message || err) });
  }
}
