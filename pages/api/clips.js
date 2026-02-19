import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function parseCSV(v) {
  if (!v) return [];
  return String(v)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

export default async function handler(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit || "12", 10), 50);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    const order = (req.query.order || "newest").toLowerCase();
    const access = parseCSV(req.query.access);
    const difficulty = parseCSV(req.query.difficulty);
    const topic = parseCSV(req.query.topic);
    const channel = parseCSV(req.query.channel);

    let q = supabase.from("clips_view").select("*", { count: "exact" });

    if (access.length) q = q.in("access_tier", access);
    if (difficulty.length) q = q.contains("difficulty_slugs", difficulty);
    if (topic.length) q = q.contains("topic_slugs", topic);
    if (channel.length) q = q.contains("channel_slugs", channel);

    q = q.order("upload_time", { ascending: order === "oldest" });
    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) throw error;

    const items = (data || []).map(row => ({
      ...row,
      can_access: row.access_tier === "free"
    }));

    res.status(200).json({ items, total: count ?? 0, limit, offset });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
