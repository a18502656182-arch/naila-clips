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
  const n = parseInt(Array.isArray(v) ? v[0] : v, 10);
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
    const limit = Math.max(1, Math.min(50, parseIntSafe(req.query.limit, 12)));
    const offset = Math.max(0, parseIntSafe(req.query.offset, 0));

    const sortRaw = Array.isArray(req.query.sort) ? req.query.sort[0] : req.query.sort;
    const sort = sortRaw === "oldest" ? "oldest" : "newest"; // newest | oldest

    const difficulty = parseCSVParam(req.query.difficulty); // beginner,advanced
    const access = parseCSVParam(req.query.access); // free,member
    const topic = parseCSVParam(req.query.topic); // slug list
    const channel = parseCSVParam(req.query.channel); // slug list

    // ===== 会员权限（先做 demo，后续接你兑换码逻辑）=====
    const demoMember = String(req.query.demo_member || "") === "1";

    // ===== helper: 通过 taxonomy type + slug 找到匹配 clip_id 集合 =====
    // 你 taxonomies.type 可能不叫 "difficulty/topic/channel"，所以我做了“兼容多种可能值”
    const TYPE_MAP = {
      difficulty: ["difficulty", "level", "clip_level"],
      topic: ["topic", "clip_topic1", "clip_topic"],
      channel: ["channel", "clip_channel"],
    };

    async function fetchClipIdsByTax(kind, slugs) {
      if (!slugs || slugs.length === 0) return null;

      const typeCandidates = TYPE_MAP[kind] || [kind];

      const { data, error } = await supabase
        .from("clip_taxonomies")
        .select("clip_id, taxonomies!inner(type, slug,)")
        .in("taxonomies.type", typeCandidates)
        .in("taxonomies.slug", slugs);

      if (error) throw error;

      const ids = new Set((data || []).map((r) => r.clip_id).filter(Boolean));
      return ids;
    }

    // ===== 1) 先按 difficulty/topic/channel 求 clip_id 交集 =====
    let filteredClipIds = null;

    if (difficulty.length > 0) {
      const ids = await fetchClipIdsByTax("difficulty", difficulty);
      filteredClipIds = filteredClipIds ? intersectSets(filteredClipIds, ids) : ids;
    }

    if (topic.length > 0) {
      const ids = await fetchClipIdsByTax("topic", topic);
      filteredClipIds = filteredClipIds ? intersectSets(filteredClipIds, ids) : ids;
    }

    if (channel.length > 0) {
      const ids = await fetchClipIdsByTax("channel", channel);
      filteredClipIds = filteredClipIds ? intersectSets(filteredClipIds, ids) : ids;
    }

    if (filteredClipIds && filteredClipIds.size === 0) {
      return res.status(200).json({ items: [], total: 0, limit, offset });
    }

    // ===== 2) 主查询 clips（按你真实列名）=====
    let q = supabase
      .from("clips")
      .select("id,title,description,duration_sec,upload_time,access_tier,cover_url,video_url", { count: "exact" });

    if (access.length > 0) q = q.in("access_tier", access);
    if (filteredClipIds) q = q.in("id", Array.from(filteredClipIds));

    // sort by upload_time
    if (sort === "oldest") q = q.order("upload_time", { ascending: true });
    else q = q.order("upload_time", { ascending: false });

    q = q.range(offset, offset + limit - 1);

    const { data: clips, error: clipsErr, count } = await q;
    if (clipsErr) throw clipsErr;

    const clipList = clips || [];
    const clipIds = clipList.map((c) => c.id);

    // ===== 3) 把 taxonomies 拉出来组装（返回 difficulty_level/topic/channel 给前端）=====
    let taxByClipId = {};
    if (clipIds.length > 0) {
      const { data: rels, error: relErr } = await supabase
        .from("clip_taxonomies")
        .select("clip_id, taxonomies(type, slug,)")
        .in("clip_id", clipIds);

      if (relErr) throw relErr;

      taxByClipId = {};
      for (const r of rels || []) {
        const cid = r.clip_id;
        const t = r.taxonomies;
        if (!cid || !t) continue;

        if (!taxByClipId[cid]) {
          taxByClipId[cid] = { difficulty: [], topic: [], channel: [] };
        }

        const type = String(t.type || "");
        const slug = t.slug;

        // 按候选类型归类
        if (TYPE_MAP.difficulty.includes(type)) taxByClipId[cid].difficulty.push(slug);
        else if (TYPE_MAP.topic.includes(type)) taxByClipId[cid].topic.push(slug);
        else if (TYPE_MAP.channel.includes(type)) taxByClipId[cid].channel.push(slug);
      }
    }

    // ===== 4) 输出 can_access + 兼容字段名 difficulty_level =====
    const items = clipList.map((c) => {
      const isFree = c.access_tier === "free";
      const canAccess = isFree ? true : demoMember ? true : false;

      const tax = taxByClipId[c.id] || { difficulty: [], topic: [], channel: [] };

      return {
        ...c,
        // 兼容你前端现在显示的字段名：
        difficulty_level: tax.difficulty[0] || null, // 暂时取第一个
        topics: tax.topic,
        channels: tax.channel,
        can_access: canAccess,
      };
    });

    return res.status(200).json({ items, total: count || 0, limit, offset });
  } catch (e) {
    return res.status(500).json({
      error: e?.message || "Unknown server error",
      hint: "Open Vercel Deployment Logs and screenshot the first red error line + stack trace.",
    });
  }
}
