// app/page.js
import { createClient } from "@supabase/supabase-js";
import FiltersClient from "./components/FiltersClient";
import ClipsGridClient from "./components/ClipsGridClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseList(v) {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v
      .flatMap((x) => String(x).split(","))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function isMissingColumnOrOperator(errMsg = "") {
  const s = String(errMsg).toLowerCase();
  return (
    s.includes("does not exist") ||
    s.includes("unknown column") ||
    s.includes("could not find") ||
    s.includes("operator does not exist")
  );
}

function normRow(r) {
  const diffArr = r.difficulty_slugs ?? r.difficulty_slug ?? r.difficulty ?? null;
  const difficulty = Array.isArray(diffArr)
    ? diffArr[0] || null
    : typeof diffArr === "string"
      ? diffArr
      : null;

  const topics = Array.isArray(r.topic_slugs)
    ? r.topic_slugs
    : Array.isArray(r.topics)
      ? r.topics
      : [];

  const channels = Array.isArray(r.channel_slugs)
    ? r.channel_slugs
    : Array.isArray(r.channels)
      ? r.channels
      : [];

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

export default async function Page({ searchParams }) {
  const supabase = getSupabaseAdmin();

  const filters = {
    difficulty: parseList(searchParams?.difficulty),
    topic: parseList(searchParams?.topic),
    channel: parseList(searchParams?.channel),
    access: parseList(searchParams?.access),
  };
  const sort = searchParams?.sort === "oldest" ? "oldest" : "newest";

  // 先固定首屏 12 条，后续滚动加载走 /rsc-api/clips
  const limit = 12;
  const offset = Math.max(parseInt(searchParams?.offset || "0", 10), 0);

  // 先用 select("*") 保证不因列名不一致而崩
  let q = supabase.from("clips_view").select("*", { count: "exact" });

  if (filters.access.length) q = q.in("access_tier", filters.access);

  // 先尝试按 *_slugs 做 overlaps；如果列不存在就降级为不筛选（但页面必须能出来）
  if (filters.difficulty.length) q = q.overlaps("difficulty_slugs", filters.difficulty);
  if (filters.topic.length) q = q.overlaps("topic_slugs", filters.topic);
  if (filters.channel.length) q = q.overlaps("channel_slugs", filters.channel);

  q = q.order("created_at", { ascending: sort === "oldest" }).range(offset, offset + limit - 1);

  let data, error, count;
  ({ data, error, count } = await q);

  // 如果因为列名/操作符不存在报错：重试一个不带 overlaps 的查询（保活）
  if (error && isMissingColumnOrOperator(error.message)) {
    let q2 = supabase.from("clips_view").select("*", { count: "exact" });
    if (filters.access.length) q2 = q2.in("access_tier", filters.access);

    q2 = q2.order("created_at", { ascending: sort === "oldest" }).range(offset, offset + limit - 1);
    ({ data, error, count } = await q2);
  }

  if (error) {
    // 这里不要白屏，直接给出可读错误
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Home (RSC 实验版)</h1>
        <pre style={{ whiteSpace: "pre-wrap", color: "crimson" }}>{error.message}</pre>
      </div>
    );
  }

  const items = (data || []).map(normRow);
  const total = typeof count === "number" ? count : null;
  const has_more = total == null ? items.length === limit : offset + limit < total;

  // taxonomies 统计先不做（最容易因为列名差异/数据量大导致崩）
  // 等你把 clips_view 实际列名发我，我们再补“完全一致”的计数/排序
  const tax = { difficulties: [], topics: [], channels: [] };

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
        Home (RSC 实验版)
      </h1>

      <FiltersClient
        initialFilters={{ ...filters, sort }}
        taxonomies={tax}
      />

      <ClipsGridClient initialItems={items} initialHasMore={has_more} />
    </div>
  );
}
