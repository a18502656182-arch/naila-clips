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

// ✅ 视图列名探测缓存（同一个 Serverless 实例里会复用，避免每次都查）
let CLIPS_VIEW_COLS = null;
let CLIPS_VIEW_COLS_AT = 0;
const CLIPS_VIEW_COLS_TTL_MS = 10 * 60 * 1000; // 10分钟刷新一次

function isArray(v) {
  return Array.isArray(v);
}

function asArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  // 有些视图可能是逗号字符串
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

export default async function handler(req, res) {
  // ✅ 权限敏感接口护栏：永远不做 public 缓存
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

    // ✅ 永远用 getUser 判断登录态
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

    // ---------- 优先走 clips_view（如果可用） ----------
    let useView = true;

    // 1) 探测 clips_view 列名（只取1行，不会慢）
    if (!CLIPS_VIEW_COLS || Date.now() - CLIPS_VIEW_COLS_AT > CLIPS_VIEW_COLS_TTL_MS) {
      const probe = await supabase.from("clips_view").select("*").limit(1);
      if (probe.error) {
        useView = false;
      } else {
        const row = (probe.data || [])[0] || {};
        CLIPS_VIEW_COLS = new Set(Object.keys(row));
        CLIPS_VIEW_COLS_AT = Date.now();
      }
    }

    if (useView && CLIPS_VIEW_COLS && CLIPS_VIEW_COLS.size > 0) {
      // 2) 确定列名（存在就用）
      const has = (c) => CLIPS_VIEW_COLS.has(c);

      // difficulty：可能是 difficulty_slugs（数组）或 difficulty_slug（单值）或 difficulty
      const colDifficultyArr = has("difficulty_slugs") ? "difficulty_slugs" : null;
      const colDifficultyOne =
        has("difficulty_slug") ? "difficulty_slug" :
        has("difficulty") ? "difficulty" :
        null;

      // topic/channel：可能是 topic_slugs/channel_slugs（数组）或 topic_slug/channel_slug（单值）
      const colTopicArr = has("topic_slugs") ? "topic_slugs" : null;
      const colChannelArr = has("channel_slugs") ? "channel_slugs" : null;

      const colTopicOne = has("topic_slug") ? "topic_slug" : null;
      const colChannelOne = has("channel_slug") ? "channel_slug" : null;

      // 必要字段（如果视图里缺关键字段，就退回老逻辑）
      const requiredCols = ["id", "access_tier", "created_at", "title", "cover_url", "video_url"];
      const missingRequired = requiredCols.some((c) => !has(c));
      if (!missingRequired) {
        let q = supabase
          .from("clips_view")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: sort === "oldest" });

        if (access.length) q = q.in("access_tier", access);

        // difficulty 过滤
        if (difficulty.length) {
          if (colDifficultyArr) q = q.overlaps(colDifficultyArr, difficulty);
          else if (colDifficultyOne) q = q.in(colDifficultyOne, difficulty);
        }

        // topic 过滤
        if (topic.length) {
          if (colTopicArr) q = q.overlaps(colTopicArr, topic);
          else if (colTopicOne) q = q.in(colTopicOne, topic);
        }

        // channel 过滤
        if (channel.length) {
          if (colChannelArr) q = q.overlaps(colChannelArr, channel);
          else if (colChannelOne) q = q.in(colChannelOne, channel);
        }

        q = q.range(offset, offset + limit - 1);

        const { data: rows, error: viewErr, count } = await q;
        if (!viewErr) {
          const total = count || 0;
          const has_more = offset + limit < total;

          const items = (rows || []).map((row) => {
            const diffArr = colDifficultyArr ? asArray(row[colDifficultyArr]) : [];
            const diffOne = colDifficultyOne ? row[colDifficultyOne] : null;

            const topicArr = colTopicArr ? asArray(row[colTopicArr]) : [];
            const channelArr = colChannelArr ? asArray(row[colChannelArr]) : [];

            // 如果是单值列也补进数组（保证前端字段结构一致）
            const topics =
              topicArr.length ? topicArr : (colTopicOne ? (row[colTopicOne] ? [row[colTopicOne]] : []) : []);
            const channels =
              channelArr.length ? channelArr : (colChannelOne ? (row[colChannelOne] ? [row[colChannelOne]] : []) : []);

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
              difficulty: diffArr[0] || diffOne || null,
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
              view_cols: Array.from(CLIPS_VIEW_COLS),
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
        }
        // 视图查询失败就退回老逻辑
      }
    }

    // ---------- 退回老逻辑（保证不崩） ----------
    // 轻量候选集合
    let q = supabase
      .from("clips")
      .select(
        `
        id, access_tier, created_at,
        clip_taxonomies (
          taxonomies ( type, slug )
        )
      `
      )
      .order("created_at", { ascending: sort === "oldest" });

    if (access.length) q = q.in("access_tier", access);

    const { data: lightRows, error: lightErr } = await q;
    if (lightErr) return res.status(500).json({ error: lightErr.message });

    const normalized = (lightRows || []).map((row) => {
      const all = (row.clip_taxonomies || []).map((ct) => ct.taxonomies).filter(Boolean);
      const diff = all.find((t) => t.type === "difficulty")?.slug || null;
      const topics = all.filter((t) => t.type === "topic").map((t) => t.slug);
      const channels = all.filter((t) => t.type === "channel").map((t) => t.slug);

      return { id: row.id, created_at: row.created_at, access_tier: row.access_tier, difficulty: diff, topics, channels };
    });

    function matches(clip) {
      if (difficulty.length) {
        if (!clip.difficulty || !difficulty.includes(clip.difficulty)) return false;
      }
      if (topic.length) {
        if (!(clip.topics || []).some((t) => topic.includes(t))) return false;
      }
      if (channel.length) {
        if (!(clip.channels || []).some((c) => channel.includes(c))) return false;
      }
      return true;
    }

    const matched = normalized.filter(matches);
    const total = matched.length;
    const page = matched.slice(offset, offset + limit);
    const pageIds = page.map((x) => x.id);
    const has_more = offset + limit < total;

    if (!pageIds.length) {
      return res.status(200).json({
        debug: { mode: "db_paged_fallback", has_user: !!user?.id, user_id: user?.id || null, userErr: userErr?.message || null, sub_debug },
        items: [],
        total,
        limit,
        offset,
        has_more,
        sort,
        filters: { difficulty, access, topic, channel },
        is_member,
      });
    }

    const { data: fullRows, error: fullErr } = await supabase
      .from("clips")
      .select(
        `
        id, title, description, duration_sec, created_at, upload_time,
        access_tier, cover_url, video_url,
        clip_taxonomies(
          taxonomies(type, slug)
        )
      `
      )
      .in("id", pageIds);

    if (fullErr) return res.status(500).json({ error: fullErr.message });

    const fullMap = new Map((fullRows || []).map((r) => [r.id, r]));

    const items = pageIds
      .map((id) => {
        const row = fullMap.get(id);
        if (!row) return null;

        const all = (row.clip_taxonomies || []).map((ct) => ct.taxonomies).filter(Boolean);
        const diff = all.find((t) => t.type === "difficulty")?.slug || null;
        const topics = all.filter((t) => t.type === "topic").map((t) => t.slug);
        const channels = all.filter((t) => t.type === "channel").map((t) => t.slug);

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
          difficulty: diff,
          topics,
          channels,
          can_access,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      debug: { mode: "db_paged_fallback", has_user: !!user?.id, user_id: user?.id || null, userErr: userErr?.message || null, sub_debug },
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
