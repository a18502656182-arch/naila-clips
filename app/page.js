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

  // ===== 列表查询（首屏 RSC 直出，参考站路线） =====
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

  // ===== 固定“免费示例卡片”（不受筛选影响）=====
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

  // counts 由 FiltersClient mount 后异步加载
  const tax = { difficulties: [], topics: [], channels: [] };

  return (
    <div style={{ background: THEME.colors.bg, minHeight: "100vh" }}>
      {/* 顶部栏（路线B产品化风格） */}
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
              // 传入当前查询 key，用于客户端判断“RSC props 已更新”，从而重置网格（不走 SPA 拉首屏）
              queryKey={new URLSearchParams(searchParams || {}).toString()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
