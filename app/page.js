// app/page.js
import { createClient } from "@supabase/supabase-js";
import FiltersClient from "./components/FiltersClient";
import ClipsGridClient from "./components/ClipsGridClient";

import HeroSection from "./components/home/HeroSection";
import HowItWorks from "./components/home/HowItWorks";
import FeaturedExamples from "./components/home/FeaturedExamples";
import SectionTitle from "./components/home/SectionTitle";
import { THEME } from "./components/home/theme";

// ✅ 移除 dynamic = "force-dynamic"，让页面可静态化并支持 ISR 刷新
export const revalidate = 60; 

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function normRow(r) {
  const difficulty = typeof r.difficulty_slug === "string" ? r.difficulty_slug : null;
  const topics = Array.isArray(r.topic_slugs) ? r.topic_slugs :[];
  const channels = Array.isArray(r.channel_slugs) ? r.channel_slugs :[];

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

// ✅ 移除 { searchParams }，服务端只负责拉取“默认的全部列表”
export default async function Page() {
  const supabase = getSupabaseAdmin();
  const limit = 12;
  const take = limit + 1;

  // 1) 首页默认列表
  let items =[];
  let has_more = false;

  try {
    const { data, error } = await supabase
      .from("clips_view")
      .select("id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url,difficulty_slug,topic_slugs,channel_slugs")
      .order("created_at", { ascending: false }) // 默认 newest
      .range(0, take - 1);

    if (error) throw error;
    
    const rows = data ||[];
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

  // 2) 固定免费示例卡
  let featured = null;
  try {
    const { data: fData } = await supabase
      .from("clips_view")
      .select("id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url,difficulty_slug,topic_slugs,channel_slugs")
      .eq("access_tier", "free")
      .order("created_at", { ascending: false })
      .limit(1);

    if (Array.isArray(fData) && fData[0]) featured = normRow(fData[0]);
  } catch {}
  if (!featured) featured = items[0] || null;

  const tax = { difficulties: [], topics: [], channels:[] };

  return (
    <div style={{ background: THEME.colors.bg, minHeight: "100vh" }}>
      {/* 顶部导航保持原样... */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(246,247,251,0.86)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${THEME.colors.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 12, background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2})`, display: "grid", placeItems: "center", color: "#fff", fontWeight: 900 }}>EC</div>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 16, fontWeight: 950, color: THEME.colors.ink }}>油管英语场景库</div>
              <div style={{ fontSize: 12, color: THEME.colors.faint }}>精选场景短片 · 双语字幕 · 词汇卡片</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href="/login" style={{ fontSize: 13, padding: "8px 12px", borderRadius: 999, border: `1px solid ${THEME.colors.border2}`, color: THEME.colors.ink, textDecoration: "none" }}>登录</a>
            <a href="/register" style={{ fontSize: 13, padding: "8px 12px", borderRadius: 999, background: THEME.colors.ink, color: "#fff", textDecoration: "none" }}>注册</a>
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
            <FiltersClient taxonomies={tax} />
          </div>
          <div style={{ marginTop: 14 }}>
            <ClipsGridClient initialItems={items} initialHasMore={has_more} />
          </div>
        </div>
      </div>
    </div>
  );
}
