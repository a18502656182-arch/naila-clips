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
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const limit = Math.max(1, Math.min(50, parseIntSafe(req.query.limit, 12)));
    const offset = Math.max(0, parseIntSafe(req.query.offset, 0));

    const sortRaw = Array.isArray(req.query.sort) ? req.query.sort[0] : req.query.sort;
    const sort = sortRaw === "oldest" ? "oldest" : "newest";

    // 全部作为 taxonomy 过滤（difficulty/topic/channel）
    const difficulty = parseCSVParam(req.query.difficulty); // beginner,advanced
    const topic = parseCSVParam(req.query.topic);           // daily,business
    const channel = parseCSVParam(req.query.channel);       // channel-a,...

    // access 还是 clips 表字段
    const access = parseCSVParam(req.query.access);         // free,member

    // 临时会员：member 需要 ?demo_member=1
    const demoMember = String(req.query.demo_member || "") === "1";

    // ===== taxonomy 过滤：slug -> taxonomy_id -> clip_id（交集）=====
    let filteredClipIds = null;

    async function slugsToTaxonomyIds(type, slugs) {
      if (!slugs || slugs.length === 0) return [];
      const { data, error } = await supabase
        .from("taxonomies")
        .select("id")
        .eq("type", type)
        .in("slug", slugs);
      if (error) throw error;
      return (data || []).map((x) => x.id);
    }

    async function taxonomyIdsToClipIds(taxonomyIds) {
      if (!taxonomyIds || taxonomyIds.length === 0) return new Set();
      const { data, error } = await supabase
        .from("clip_taxonomies")
        .select("clip_id")
        .in("taxonomy_id", taxonomyIds);
      if (error) throw error;
      return new Set((data || []).map((x) => x.clip_id).filter(Boolean));
    }

    async function applyTaxFilter(type, slugs) {
      if (!slugs || slugs.length === 0) return;
      const taxIds = await slugsToTaxonomyIds(type, slugs);
      const ids = await taxonomyIdsToClipIds(taxIds);
      filteredClipIds = filteredClipIds ? intersectSets(filteredClipIds, ids) : ids;
    }

    await applyTaxFilter("difficulty", difficulty);
    await applyTaxFilter("topic", topic);
    await applyTaxFilter("channel", channel);

    if (filteredClipIds && filteredClipIds.size === 0) {
      return res.status(200).json({ version: "clips-api-v3", items: [], total: 0, limit, offset });
    }

    // ===== 主查询 clips（按你真实字段名）=====
    let q = supabase
      .from("clips")
      .select("id,title,description,duration_sec,upload_time,created_at,access_tier,cover_url,video_url", { count: "exact" });

    if (access.length > 0) q = q.in("access_tier", access);
    if (filteredClipIds) q = q.in("id", Array.from(filteredClipIds));

    // 排序：优先用 upload_time
    q = q.order("upload_time", { ascending: sort === "oldest" });
    q = q.range(offset, offset + limit - 1);

    const { data: clips, error: clipsErr, count } = await q;
    if (clipsErr) throw clipsErr;

    // ===== 输出（把 difficulty 也返回给前端显示用）=====
    // 为了简单：这里直接把 difficulty 从 query 回填（后续我们再做“查询每条 clip 的难度真实值”）
    const items = (clips || []).map((c) => {
      const isFree = c.access_tier === "free";
      const canAccess = isFree ? true : demoMember ? true : false;

      return {
        ...c,
        can_access: canAccess,
      };
    });

    return res.status(200).json({ version: "clips-api-v3", items, total: count || 0, limit, offset });
  } catch (e) {
    return res.status(500).json({
      error: e?.message || "Unknown server error",
      hint: "Open Vercel → Deployments → Logs, screenshot the first red line + stack trace",
    });
  }
}
