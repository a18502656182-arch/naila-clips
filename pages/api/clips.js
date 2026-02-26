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
    return {
      is_member: false,
      debug: { ok: false, reason: "query_error", message: r.error.message, used: r.dateCol },
    };
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

function asArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
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

    // ✅ clips_view：使用你真实存在的 difficulty_slug（单值）
    // topic/channel：优先尝试数组列 topic_slugs/channel_slugs；如果你视图里是单值列 topic_slug/channel_slug 也能兼容
    let q = supabase
      .from("clips_view")
      .select(
        `
        id, title, description, duration_sec, created_at, upload_time,
        access_tier, cover_url, video_url,
        difficulty_slug,
        topic_slugs, channel_slugs,
        topic_slug, channel_slug
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: sort === "oldest" });

    if (access.length) q = q.in("access_tier", access);

    if (difficulty.length) q = q.in("difficulty_slug", difficulty);

    // topic/channel：如果视图有数组列，就 overlaps；如果数组列为空/不存在，会由 Supabase 报列不存在
    // 为避免你视图没有这些列导致 500，我们用 try/catch 分两段执行（先数组版，失败再退回单值版）
    const runQuery = async (queryBuilder) => {
      return await queryBuilder.range(offset, offset + limit - 1);
    };

    // 先尝试数组列过滤
    let data, err, count;
    try {
      let qArr = q;
      if (topic.length) qArr = qArr.overlaps("topic_slugs", topic);
      if (channel.length) qArr = qArr.overlaps("channel_slugs", channel);
      const r = await runQuery(qArr);
      data = r.data;
      err = r.error;
      count = r.count;
      // 如果列不存在，会走到 err
      if (err) throw err;
    } catch (e) {
      // 退回单值列过滤（如果你视图是 topic_slug/channel_slug）
      let qOne = q;
      if (topic.length) qOne = qOne.in("topic_slug", topic);
      if (channel.length) qOne = qOne.in("channel_slug", channel);
      const r2 = await runQuery(qOne);
      data = r2.data;
      err = r2.error;
      count = r2.count;
      if (err) return res.status(500).json({ error: err.message });
    }

    const total = count || 0;
    const has_more = offset + limit < total;

    const items = (data || []).map((row) => {
      const topics = asArray(row.topic_slugs).length ? asArray(row.topic_slugs) : (row.topic_slug ? [row.topic_slug] : []);
      const channels = asArray(row.channel_slugs).length ? asArray(row.channel_slugs) : (row.channel_slug ? [row.channel_slug] : []);

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
        topics,
        channels,
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
