// pages/api/clips.js
import { createClient } from "@supabase/supabase-js";

function parseCSVParam(v) {
  if (!v) return [];
  if (Array.isArray(v)) v = v[0];
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseIntSafe(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function intersectSets(a, b) {
  const out = new Set();
  for (const x of a) if (b.has(x)) out.add(x);
  return out;
}

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY in Vercel env" });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // ===== Query Params =====
    const limit = Math.max(1, Math.min(50, parseIntSafe(req.query.limit, 10)));
    const offset = Math.max(0, parseIntSafe(req.query.offset, 0));

    const sortRaw = Array.isArray(req.query.sort) ? req.query.sort[0] : req.query.sort;
    const sort = sortRaw === "oldest" ? "oldest" : "newest"; // newest | oldest

    const difficulty = parseCSVParam(req.query.difficulty); // beginner,advanced
    const access = parseCSVParam(req.query.access); // free,member
    const topic = parseCSVParam(req.query.topic); // slug list
    const channel = parseCSVParam(req.query.channel); // slug list

    // ===== 会员权限（先做基础版）=====
    // 现在先实现：free 永远可访问；member 先默认不可访问（除非你传 ?demo_member=1）
    // 等你做 Supabase Auth + redeem 激活后，我们把这里替换成“按 user subscription 判断”。
    const demoMember = String(req.query.demo_member || "") === "1";

    // ===== 如果 topic/channel 有筛选：先从 join 表找 clip_id，再回表查 clips =====
    // 这里假设表结构：
    // clip_taxonomies: (clip_id, taxonomy_id)
    // taxonomies: (id, type, slug, name)
    // clips: (id, title, cover_url, video_url, duration_sec, created_at, difficulty_level, access_tier)
    //
    // 如果你列名不同，Vercel Logs 会报错，我们按报错改成你的实际字段名即可。

    let filteredClipIds = null; // Set 或 null（null 表示不按 join 限制）

    async function fetchClipIdsByTax(type, slugs) {
      if (!slugs || slugs.length === 0) return null;

      const { data, error } = await supabase
        .from("clip_taxonomies")
        .select("clip_id, taxonomies!inner(type, slug)")
        .eq("taxonomies.type", type)
        .in("taxonomies.slug", slugs);

      if (error) throw error;

      const ids = new Set((data || []).map((r) => r.clip_id).filter(Boolean));
      return ids;
    }

    if (topic.length > 0) {
      const ids = await fetchClipIdsByTax("topic", topic);
      filteredClipIds = filteredClipIds ? intersectSets(filteredClipIds, ids) : ids;
    }

    if (channel.length > 0) {
      const ids = await fetchClipIdsByTax("channel", channel);
      filteredClipIds = filteredClipIds ? intersectSets(filteredClipIds, ids) : ids;
    }

    // 如果筛选导致无结果：直接返回空
    if (filteredClipIds && filteredClipIds.size === 0) {
      return res.status(200).json({ items: [], total: 0, limit, offset });
    }

    // ===== 主查询 clips =====
    let q = supabase
      .from("clips")
      .select(
        "id,title,cover_url,video_url,duration_sec,created_at,difficulty_level,access_tier",
        { count: "exact" }
      );

    // difficulty/access 多选
    if (difficulty.length > 0) q = q.in("difficulty_level", difficulty);
    if (access.length > 0) q = q.in("access_tier", access);

    // topic/channel join 限制后的 clip ids
    if (filteredClipIds) {
      q = q.in("id", Array.from(filteredClipIds));
    }

    // sort
    if (sort === "oldest") q = q.order("created_at", { ascending: true });
    else q = q.order("created_at", { ascending: false });

    // pagination
    q = q.range(offset, offset + limit - 1);

    const { data: clips, error: clipsErr, count } = await q;
    if (clipsErr) throw clipsErr;

    // ===== 输出 can_access =====
    const items = (clips || []).map((c) => {
      const isFree = c.access_tier === "free";
      const canAccess = isFree ? true : demoMember ? true : false;

      return {
        ...c,
        can_access: canAccess,
      };
    });

    return res.status(200).json({
      items,
      total: count || 0,
      limit,
      offset,
    });
  } catch (e) {
    return res.status(500).json({
      error: e?.message || "Unknown server error",
      hint:
        "If this happened after upgrading filters, please open Vercel Deployment Logs and screenshot the first red error line + stack trace.",
    });
  }
}
