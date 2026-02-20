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
    // ===== 额外查询：给每条 clip 加上 difficulty/topics/channels =====
const clipIds = (clips || []).map((c) => c.id).filter(Boolean);

let taxMap = {}; // { clip_id: { difficulty:[], topics:[], channels:[] } }
for (const id of clipIds) taxMap[id] = { difficulty: [], topics: [], channels: [] };

if (clipIds.length > 0) {
  const { data: links, error: linksErr } = await supabase
    .from("clip_taxonomies")
    .select("clip_id,taxonomy_id")
    .in("clip_id", clipIds);

  if (linksErr) throw linksErr;

  const taxIds = Array.from(new Set((links || []).map((x) => x.taxonomy_id).filter(Boolean)));

  if (taxIds.length > 0) {
    const { data: taxRows, error: taxErr } = await supabase
      .from("taxonomies")
      .select("id,type,slug")
      .in("id", taxIds);

    if (taxErr) throw taxErr;

    const taxById = {};
    for (const t of taxRows || []) taxById[t.id] = t;

    for (const lk of links || []) {
      const t = taxById[lk.taxonomy_id];
      if (!t) continue;
      if (!taxMap[lk.clip_id]) taxMap[lk.clip_id] = { difficulty: [], topics: [], channels: [] };

      if (t.type === "difficulty") taxMap[lk.clip_id].difficulty.push(t.slug);
      if (t.type === "topic") taxMap[lk.clip_id].topics.push(t.slug);
      if (t.type === "channel") taxMap[lk.clip_id].channels.push(t.slug);
    }
  }
}

const items = (clips || []).map((c) => {
  const isFree = c.access_tier === "free";
  const canAccess = isFree ? true : demoMember ? true : false;

  const tags = taxMap[c.id] || { difficulty: [], topics: [], channels: [] };

  return {
    ...c,
    can_access: canAccess,
    difficulty: tags.difficulty,
    topics: tags.topics,
    channels: tags.channels,
  };
});

return res.status(200).json({ version: "clips-api-v4", items, total: count || 0, limit, offset });
  } catch (e) {
    return res.status(500).json({
      error: e?.message || "Unknown server error",
      hint: "Open Vercel → Deployments → Logs, screenshot the first red line + stack trace",
    });
  }
}
