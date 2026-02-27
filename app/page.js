// app/page.js
import FiltersClient from "./components/FiltersClient";
import ClipsGridClient from "./components/ClipsGridClient";

import HeroSection from "./components/home/HeroSection";
import HowItWorks from "./components/home/HowItWorks";
import FeaturedExamples from "./components/home/FeaturedExamples";
import SectionTitle from "./components/home/SectionTitle";
import { THEME } from "./components/home/theme";

export const revalidate = 30;

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

function supabaseRestHeaders() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  };
}

// PostgREST: array overlaps 用 ov.{a,b}；in 用 in.(a,b)
function buildClipsViewUrl({ filters, sort, limit, offset }) {
  const { url } = supabaseRestHeaders();
  const params = new URLSearchParams();

  params.set(
    "select",
    "id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url,difficulty_slug,topic_slugs,channel_slugs"
  );

  // 排序：created_at.desc / asc
  params.set("order", `created_at.${sort === "oldest" ? "asc" : "desc"}`);

  // 极速分页：limit+1 判断 has_more
  params.set("limit", String(limit + 1));
  params.set("offset", String(offset));

  // filters
  if (filters.access?.length) params.set("access_tier", `in.(${filters.access.join(",")})`);
  if (filters.difficulty?.length) params.set("difficulty_slug", `in.(${filters.difficulty.join(",")})`);
  if (filters.topic?.length) params.set("topic_slugs", `ov.{${filters.topic.join(",")}}`);
  if (filters.channel?.length) params.set("channel_slugs", `ov.{${filters.channel.join(",")}}`);

  return `${url}/rest/v1/clips_view?${params.toString()}`;
}

async function fetchJson(url, headers, revalidateSec) {
  const res = await fetch(url, {
    headers,
    next: { revalidate: revalidateSec },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fetch failed: ${res.status} ${text}`);
  }
  return res.json();
}

export default async function Page({ searchParams }) {
  const filters = {
    difficulty: parseList(searchParams?.difficulty),
    topic: parseList(searchParams?.topic),
    channel: parseList(searchParams?.channel),
    access: parseList(searchParams?.access),
  };
  const sort = searchParams?.sort === "oldest" ? "oldest" : "newest";

  const limit = 12;
  const offset = Math.max(parseInt(searchParams?.offset || "0", 10), 0);

  const { headers } = supabaseRestHeaders();

  // 1) 首页列表（可被 Next fetch cache 推导）
  let items = [];
  let has_more = false;

  try {
    const listUrl = buildClipsViewUrl({ filters, sort, limit, offset });
    const rows = await fetchJson(listUrl, headers, 30);

    const hasMore = Array.isArray(rows) && rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    items = (pageRows || []).map(normRow);
    has_more = hasMore;
  } catch (e) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Home (RSC 实验版)</h1>
        <pre style={{ whiteSpace: "pre-wrap", color: "crimson" }}>{e?.message || "Load failed"}</pre>
      </div>
    );
  }

  // 2) 固定示例卡（free 最新一条）
  let featured = null;
  try {
    const { url } = supabaseRestHeaders();
    const p = new URLSearchParams();
    p.set(
      "select",
      "id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url,difficulty_slug,topic_slugs,channel_slugs"
    );
    p.set("access_tier", "eq.free");
    p.set("order", "created_at.desc");
    p.set("limit", "1");

    const featUrl = `${url}/rest/v1/clips_view?${p.toString()}`;
    const fRows = await fetchJson(featUrl, headers, 300);
    if (Array.isArray(fRows) && fRows[0]) featured = normRow(fRows[0]);
  } catch {}
  if (!featured) featured = items[0] || null;

  const tax = { difficulties: [], topics: [], channels: [] };

  return (
    <div style={{ background: THEME.colors.bg, minHeight: "100vh" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(246,247,251,0.86)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${THEME.colors.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2})`,
                boxShadow: "0 10px 24px rgba(79,70,229,0.20)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontWeight: 900,
                userSelect: "none",
              }}
              aria-hidden
            >
              EC
            </div>

            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 16, fontWeight: 950, color: THEME.colors.ink }}>油管英语场景库</div>
              <div style={{ fontSize: 12, color: THEME.colors.faint }}>精选场景短片 · 双语字幕 · 词汇卡片</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a
              href="/login"
              style={{
                fontSize: 13,
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${THEME.colors.border2}`,
                color: THEME.colors.ink,
                textDecoration: "none",
                background: "rgba(255,255,255,0.7)",
              }}
            >
              登录
            </a>
            <a
              href="/register"
              style={{
                fontSize: 13,
                padding: "8px 12px",
                borderRadius: 999,
                background: THEME.colors.ink,
                color: "#fff",
                textDecoration: "none",
                boxShadow: "0 10px 22px rgba(11,18,32,0.18)",
              }}
            >
              注册
            </a>
          </div>
        </div>
      </div>

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
            <ClipsGridClient
              initialItems={items}
              initialHasMore={has_more}
              queryKey={new URLSearchParams(searchParams || {}).toString()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
