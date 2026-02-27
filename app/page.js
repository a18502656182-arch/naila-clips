// app/page.js
import { createClient } from "@supabase/supabase-js";
import FiltersClient from "./components/FiltersClient";
import ClipsGridClient from "./components/ClipsGridClient";

import HeroSection from "./components/home/HeroSection";
import HowItWorks from "./components/home/HowItWorks";
import FeaturedExamples from "./components/home/FeaturedExamples";
import SectionTitle from "./components/home/SectionTitle";
import { THEME } from "./components/home/theme";

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

function normRow(r) {
  const difficulty = typeof r.difficulty_slug === "string" ? r.difficulty_slug : null;
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

export default async function Page({ searchParams }) {
  const supabase = getSupabaseAdmin();

  const filters = {
    difficulty: parseList(searchParams?.difficulty),
    topic: parseList(searchParams?.topic),
    channel: parseList(searchParams?.channel),
    access: parseList(searchParams?.access),
  };
  const sort = searchParams?.sort === "oldest" ? "oldest" : "newest";

  const limit = 12;
  const offset = Math.max(parseInt(searchParams?.offset || "0", 10), 0);
  const take = limit + 1;

  let q = supabase
    .from("clips_view")
    .select(
      "id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url,difficulty_slug,topic_slugs,channel_slugs"
    );

  if (filters.access.length) q = q.in("access_tier", filters.access);
  if (filters.difficulty.length) q = q.in("difficulty_slug", filters.difficulty);
  if (filters.topic.length) q = q.overlaps("topic_slugs", filters.topic);
  if (filters.channel.length) q = q.overlaps("channel_slugs", filters.channel);

  q = q
    .order("created_at", { ascending: sort === "oldest" })
    .range(offset, offset + take - 1);

  const { data, error } = await q;

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Home (RSC 实验版)</h1>
        <pre style={{ whiteSpace: "pre-wrap", color: "crimson" }}>{error.message}</pre>
      </div>
    );
  }

  const rows = data || [];
  const has_more = rows.length > limit;
  const pageRows = has_more ? rows.slice(0, limit) : rows;
  const items = pageRows.map(normRow);

  // 固定免费示例卡：保持你之前逻辑（如果你已经这样做了就继续）
  let featured = null;
  try {
    const { data: fData } = await supabase
      .from("clips_view")
      .select(
        "id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url,difficulty_slug,topic_slugs,channel_slugs"
      )
      .eq("access_tier", "free")
      .order("created_at", { ascending: false })
      .limit(1);

    if (Array.isArray(fData) && fData[0]) featured = normRow(fData[0]);
  } catch {}
  if (!featured) featured = items[0] || null;

  const tax = { difficulties: [], topics: [], channels: [] };

  return (
    <div style={{ background: THEME.colors.bg, minHeight: "100vh" }}>
      {/* 顶部栏略（保持你现有那段即可，这里不重复） */}
      {/* 你如果已替换过顶部栏，请保留你自己的版本 */}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "18px 16px 40px" }}>
        <HeroSection>
          <HowItWorks />
          <FeaturedExamples featured={featured} />
        </HeroSection>

        <div style={{ marginTop: 18 }}>
          <SectionTitle title="全部视频" />

          <div style={{ marginTop: 10 }}>
            <FiltersClient initialFilters={{ ...filters, sort }} taxonomies={tax} />
          </div>

          <div style={{ marginTop: 14 }}>
            <ClipsGridClient initialItems={items} initialHasMore={has_more} />
          </div>
        </div>
      </div>
    </div>
  );
}
