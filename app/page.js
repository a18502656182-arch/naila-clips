// app/page.js
import { createClient } from "@supabase/supabase-js";
import FiltersClient from "./components/FiltersClient";
import ClipsGridClient from "./components/ClipsGridClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap((x) => String(x).split(",")).map((s) => s.trim()).filter(Boolean);
  return String(v).split(",").map((s) => s.trim()).filter(Boolean);
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function normRow(r) {
  const difficulty = Array.isArray(r.difficulty_slugs) ? (r.difficulty_slugs[0] || null) : (r.difficulty_slugs || null);
  const topics = Array.isArray(r.topic_slugs) ? r.topic_slugs : [];
  const channels = Array.isArray(r.channel_slugs) ? r.channel_slugs : [];
  return {
    id: r.id,
    title: r.title ?? "",
    description: r.description ?? null,
    duration_sec: r.duration_sec ?? null,
    created_at: r.created_at,
    upload_time: r.upload_time ?? null,
    access_tier: r.access_tier,
    cover_url: r.cover_url ?? null,
    video_url: r.video_url ?? null,
    difficulty,
    topics,
    channels,
  };
}

async function getTaxonomiesWithCounts(supabase, filters, sort) {
  // 读取所有 taxonomies（type+slug）
  const { data: taxRows, error: taxErr } = await supabase
    .from("taxonomies")
    .select("type, slug")
    .order("type", { ascending: true })
    .order("slug", { ascending: true });

  if (taxErr) throw new Error(taxErr.message);

  const difficulties = (taxRows || []).filter((t) => t.type === "difficulty");
  const topics = (taxRows || []).filter((t) => t.type === "topic");
  const channels = (taxRows || []).filter((t) => t.type === "channel");

  // 用 clips_view 计算 counts（只取轻字段）
  let q = supabase
    .from("clips_view")
    .select("access_tier,difficulty_slugs,topic_slugs,channel_slugs,created_at")
    .order("created_at", { ascending: sort === "oldest" });

  // 只对 access 先过滤（与你 pages/api/taxonomies 思路一致）
  if (filters.access.length) q = q.in("access_tier", filters.access);

  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);

  const normalized = (rows || []).map((r) => ({
    access_tier: r.access_tier,
    difficulty: Array.isArray(r.difficulty_slugs) ? (r.difficulty_slugs[0] || null) : null,
    topics: Array.isArray(r.topic_slugs) ? r.topic_slugs : [],
    channels: Array.isArray(r.channel_slugs) ? r.channel_slugs : [],
  }));

  const counts = { difficulty: {}, access: {}, topic: {}, channel: {} };
  const inc = (m, k) => { if (!k) return; m[k] = (m[k] || 0) + 1; };

  const matches = (clip, f) => {
    if (f.access?.length && !f.access.includes(clip.access_tier)) return false;
    if (f.difficulty?.length) { if (!clip.difficulty || !f.difficulty.includes(clip.difficulty)) return false; }
    if (f.topic?.length) { if (!(clip.topics || []).some((t) => f.topic.includes(t))) return false; }
    if (f.channel?.length) { if (!(clip.channels || []).some((c) => f.channel.includes(c))) return false; }
    return true;
  };

  // difficulty counts（放开 difficulty）
  {
    const f = { access: filters.access, difficulty: [], topic: filters.topic, channel: filters.channel };
    normalized.filter((c) => matches(c, f)).forEach((c) => inc(counts.difficulty, c.difficulty));
  }

  // access counts（放开 access）
  {
    const f = { access: [], difficulty: filters.difficulty, topic: filters.topic, channel: filters.channel };
    normalized.filter((c) => matches(c, f)).forEach((c) => inc(counts.access, c.access_tier));
  }

  // topic counts（放开 topic）
  {
    const f = { access: filters.access, difficulty: filters.difficulty, topic: [], channel: filters.channel };
    normalized.filter((c) => matches(c, f)).forEach((c) => (c.topics || []).forEach((t) => inc(counts.topic, t)));
  }

  // channel counts（放开 channel）
  {
    const f = { access: filters.access, difficulty: filters.difficulty, topic: filters.topic, channel: [] };
    normalized.filter((c) => matches(c, f)).forEach((c) => (c.channels || []).forEach((ch) => inc(counts.channel, ch)));
  }

  const sortByCountThenName = (arr) =>
    (arr || []).slice().sort((a, b) => {
      const ca = a.count || 0;
      const cb = b.count || 0;
      if (cb !== ca) return cb - ca;
      return String(a.slug).localeCompare(String(b.slug));
    });

  return {
    difficulties: sortByCountThenName(difficulties.map((x) => ({ slug: x.slug, name: x.slug, count: counts.difficulty[x.slug] || 0 }))),
    topics: sortByCountThenName(topics.map((x) => ({ slug: x.slug, name: x.slug, count: counts.topic[x.slug] || 0 }))),
    channels: sortByCountThenName(channels.map((x) => ({ slug: x.slug, name: x.slug, count: counts.channel[x.slug] || 0 }))),
  };
}

export default async function Page({ searchParams }) {
  const supabase = getSupabaseAdmin();

  const filters = {
    difficulty: parseList(searchParams?.difficulty),
    topic: parseList(searchParams?.topic),
    channel: parseList(searchParams?.channel),
    access: parseList(searchParams?.access),
  };
  const sort = searchParams?.sort === "oldest" ? "oldest" : "newest";

  // 首屏列表：用 clips_view 数据库侧筛选分页（快）
  const limit = 12;
  const offset = Math.max(parseInt(searchParams?.offset || "0", 10), 0);

  let q = supabase
    .from("clips_view")
    .select("id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url,difficulty_slugs,topic_slugs,channel_slugs", { count: "exact" });

  if (filters.access.length) q = q.in("access_tier", filters.access);
  if (filters.difficulty.length) q = q.overlaps("difficulty_slugs", filters.difficulty);
  if (filters.topic.length) q = q.overlaps("topic_slugs", filters.topic);
  if (filters.channel.length) q = q.overlaps("channel_slugs", filters.channel);

  q = q.order("created_at", { ascending: sort === "oldest" }).range(offset, offset + limit - 1);

  const [{ data, error, count }, tax] = await Promise.all([
    q,
    getTaxonomiesWithCounts(supabase, filters, sort),
  ]);

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Home (RSC 实验版)</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
      </div>
    );
  }

  const items = (data || []).map(normRow);
  const total = typeof count === "number" ? count : null;
  const has_more = total == null ? (items.length === limit) : (offset + limit < total);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Home (RSC 实验版)</h1>

      <FiltersClient
        initialFilters={{ ...filters, sort }}
        taxonomies={tax}
      />

      <ClipsGridClient initialItems={items} initialHasMore={has_more} />
    </div>
  );
}
