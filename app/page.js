// app/page.js
import { createClient } from "@supabase/supabase-js";
import { Suspense } from "react";
import FiltersClient from "./components/FiltersClient";
import ClipsGridClient from "./components/ClipsGridClient";

import HeroSection from "./components/home/HeroSection";
import HowItWorks from "./components/home/HowItWorks";
import FeaturedExamples from "./components/home/FeaturedExamples";
import SectionTitle from "./components/home/SectionTitle";
import { THEME } from "./components/home/theme";

// ✅ 参考站风格：允许边缘复用 + SWR
export const revalidate = 60;

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

  // ✅ RSC：服务端按筛选直出列表（回归参考站数据流）
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

  let items = [];
  let has_more = false;

  try {
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
    if (error) throw error;

    const rows = data || [];
    has_more = rows.length > limit;
    const pageRows = has_more ? rows.slice(0, limit) : rows;
    items = pageRows.map(normRow);
  } catch (e) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Home (RSC 实验版)</h1>
        <pre style={{ whiteSpace: "pre-wrap", color: "crimson" }}>{e?.message || "Load failed"}</pre>
      </div>
    );
  }

  // 2) 固定免费示例卡（不跟随筛选，参考站风格 Hero 示例）
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

  // counts 仍由 FiltersClient 异步拉取（你已有 /rsc-api/taxonomies）
  const tax = { difficulties: [], topics: [], channels: [] };

  // ✅ 传给客户端：用于“筛选变化后重置无限滚动状态”
  const queryKey = new URLSearchParams(searchParams || {}).toString();

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
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontWeight: 900,
              }}
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

          {/* ✅ Client 组件使用 useSearchParams：保持 Suspense 包裹 */}
          <Suspense fallback={<div style={{ padding: 20, textAlign: "center", color: THEME.colors.faint }}>加载中...</div>}>
            <div style={{ marginTop: 10 }}>
              <FiltersClient initialFilters={{ ...filters, sort }} taxonomies={tax} />
            </div>

            <div style={{ marginTop: 14 }}>
              <ClipsGridClient
                initialItems={items}
                initialHasMore={has_more}
                queryKey={queryKey}
              />
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
