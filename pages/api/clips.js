// pages/api/clips.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

function parseList(v) {
  if (!v) return [];
  if (Array.isArray(v)) v = v.join(",");
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function getMembership(supabase, userId) {
  const now = Date.now();

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
  if (
    r.error &&
    String(r.error.message || "").toLowerCase().includes("column") &&
    String(r.error.message || "").includes("ends_at")
  ) {
    r = await tryQuery("expires_at");
  }

  if (r.error) {
    return { is_member: false, debug: { ok: false, reason: "query_error", message: r.error.message, used: r.dateCol } };
  }

  const sub = r.data;
  if (!sub) return { is_member: false, debug: { ok: false, reason: "no_subscription_row", used: r.dateCol } };

  const status = sub.status ?? null;
  const plan = sub.plan ?? null;
  const end_at = sub[r.dateCol] ?? null;

  let is_member = false;
  if (status === "active") {
    if (!end_at) {
      is_member = true;
    } else {
      const endMs = new Date(end_at).getTime();
      if (!Number.isNaN(endMs) && endMs > now) is_member = true;
    }
  }

  return { is_member, debug: { ok: true, used: r.dateCol, raw: { status, plan, end_at } } };
}

export default async function handler(req, res) {
  // ✅ 会员权限护栏：/api/clips 永远不做 public 缓存
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    const supabase = createPagesServerClient({ req, res });

    const difficulty = parseList(req.query.difficulty);
    const access = parseList(req.query.access);
    const topic = parseList(req.query.topic);
    const channel = parseList(req.query.channel);

    const sort = req.query.sort === "oldest" ? "oldest" : "newest";
    const limit = Math.min(Math.max(parseInt(req.query.limit || "12", 10), 1), 50);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    let is_member = false;
    let sub_debug = { ok: false, reason: "not_logged_in" };
    if (user?.id && !userErr) {
      const m = await getMembership(supabase, user.id);
      is_member = !!m.is_member;
      sub_debug = m.debug;
    }

    // ✅ clips_view 正确列名版：
    // difficulty_slug (单值)
    // topic_slugs / channel_slugs (数组)
    let q = supabase
      .from("clips_view")
      .select(
        `
        id, title, description, duration_sec, created_at, upload_time,
        access_tier, cover_url, video_url,
        difficulty_slug, topic_slugs, channel_slugs
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: sort === "oldest" });

    if (access.length) q = q.in("access_tier", access);
    if (difficulty.length) q = q.in("difficulty_slug", difficulty);
    if (topic.length) q = q.overlaps("topic_slugs", topic);
    if (channel.length) q = q.overlaps("channel_slugs", channel);

    q = q.range(offset, offset + limit - 1);

    const { data: rows, error: err, count } = await q;
    if (err) return res.status(500).json({ error: err.message });

    const total = count || 0;
    const has_more = offset + limit < total;

    const items = (rows || []).map((row) => {
      const can_access = row.access_tier === "free" ? true : Boolean(is_member);
      return {
        id: row.id,
        title: row.title,
        description: row.description ?? null,
        duration_sec: row.duration_sec ?? null,
        created_at: row.created_at,
        upload_time: row.upload_time ?? null,
        access_tier: row.access_tier,
        cover_url: row.cover_url ?? null,
        video_url: row.video_url ?? null,
        difficulty: row.difficulty_slug ?? null,
        topics: Array.isArray(row.topic_slugs) ? row.topic_slugs : [],
        channels: Array.isArray(row.channel_slugs) ? row.channel_slugs : [],
        can_access,
      };
    });

    return res.status(200).json({
      debug: {
        mode: "clips_view_paged",
        has_user: !!user?.id,
        user_id: user?.id || null,
        userErr: userErr?.message || null,
        sub_debug,
      },
      items,
      total,
      limit,
      offset,
      has_more,
      sort,
      filters: { difficulty, access, topic, channel },
      is_member,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
