// app/page.js
import { createClient } from "@supabase/supabase-js";
import FiltersClient from "./components/FiltersClient";
import ClipsGridClient from "./components/ClipsGridClient";

import HeroSection from "./components/home/HeroSection";
import HowItWorks from "./components/home/HowItWorks";
import FeaturedExamples from "./components/home/FeaturedExamples";
import SectionTitle from "./components/home/SectionTitle";

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

  // 首屏固定 12（和接口默认一致）
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

  // taxonomies counts 已经改成客户端异步加载（FiltersClient 内部 fetch /rsc-api/taxonomies）
  // 所以这里给空结构即可，首屏更快
  const tax = { difficulties: [], topics: [], channels: [] };

  const featured = items[0] || null;

  return (
    <div style={{ background: "#fff" }}>
      {/* 顶部导航（静态壳：不依赖 API） */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #2563eb, #06b6d4)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontWeight: 900,
                userSelect: "none",
              }}
              aria-hidden
            >
              ▶
            </div>

            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>油管英语场景库</div>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
                精选 YouTube 场景短片，边看边学地道英语。
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* 先做 UI 复刻：不接现网登录态逻辑，避免破坏；后续再接入 */}
            <a
              href="/login"
              style={{
                fontSize: 13,
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.12)",
                color: "rgba(0,0,0,0.75)",
                textDecoration: "none",
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
                background: "#111827",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              注册
            </a>
          </div>
        </div>
      </div>

      {/* 主体容器 */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "18px 16px 40px" }}>
        {/* Hero 大区（结构复刻：Hero + 左侧说明卡 + 右侧示例卡） */}
        <HeroSection>
          <HowItWorks />
          <FeaturedExamples featured={featured} />
        </HeroSection>

        {/* 全部视频 */}
        <div style={{ marginTop: 18 }}>
          <SectionTitle title="全部视频" />

          {/* 筛选条（保持你已有 FiltersClient 逻辑不变） */}
          <div style={{ marginTop: 10 }}>
            <FiltersClient initialFilters={{ ...filters, sort }} taxonomies={tax} />
          </div>

          {/* 列表（保持你已有护栏/极速分页逻辑不变） */}
          <div style={{ marginTop: 14 }}>
            <ClipsGridClient
              key={JSON.stringify(searchParams || {})}
              initialItems={items}
              initialHasMore={has_more}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
