// app/rsc-api/clips/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  // 兼容：difficulty 可能是 difficulty_slugs / difficulty_slug / difficulty
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

// 如果某个筛选字段在 clips_view 中不存在/不支持，我们就跳过该筛选，保证接口可用（实验线先跑通）
function isMissingColumnOrOperator(errMsg = "") {
  const s = String(errMsg).toLowerCase();
  return (
    s.includes("does not exist") || // column ... does not exist / operator does not exist
    s.includes("unknown column") ||
    s.includes("could not find") ||
    s.includes("operator does not exist")
  );
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const difficulty = parseList(searchParams.get("difficulty"));
  const access = parseList(searchParams.get("access"));
  const topic = parseList(searchParams.get("topic"));
  const channel = parseList(searchParams.get("channel"));

  const sort = searchParams.get("sort") === "oldest" ? "oldest" : "newest";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "12", 10), 1), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const supabase = getSupabaseAdmin();

  // ✅ 修复：这里不能多一个括号
  let q = supabase
    .from("clips_view")
    .select("*", { count: "exact" });

  // 访问权限过滤（通常列存在）
  if (access.length) q = q.in("access_tier", access);

  // 下面三个筛选字段：先尝试按 *_slugs 过滤，若数据库报不存在/不支持则降级为不筛选（防止整页炸）
  // 这样滚动加载依然能用，后续我们再根据 clips_view 实际列名做“完全一致”的精准版本
  const filtersWanted = {
    difficulty: !!difficulty.length,
    topic: !!topic.length,
    channel: !!channel.length,
  };

  if (difficulty.length) q = q.overlaps("difficulty_slugs", difficulty);
  if (topic.length) q = q.overlaps("topic_slugs", topic);
  if (channel.length) q = q.overlaps("channel_slugs", channel);

  q = q
    .order("created_at", { ascending: sort === "oldest" })
    .range(offset, offset + limit - 1);

  let data, error, count;

  ({ data, error, count } = await q);

  // 如果因为列名/操作符不存在导致失败：降级（去掉那几个 overlaps）再查一次
  if (error && isMissingColumnOrOperator(error.message)) {
    // 重新构建一个不带 overlaps 的查询（保留 access + 分页排序）
    let q2 = supabase
      .from("clips_view")
      .select("*", { count: "exact" });

    if (access.length) q2 = q2.in("access_tier", access);

    q2 = q2
      .order("created_at", { ascending: sort === "oldest" })
      .range(offset, offset + limit - 1);

    ({ data, error, count } = await q2);

    // 仍然失败就返回错误（这说明不是列名问题，而是更底层的权限/连接等）
    if (error) {
      return NextResponse.json(
        { error: error.message, debug: { degraded: true, filtersWanted } },
        { status: 500 }
      );
    }

    const items = (data || []).map(normRow);
    const total = typeof count === "number" ? count : null;
    const has_more = total == null ? items.length === limit : offset + limit < total;

    return NextResponse.json({
      items,
      total,
      limit,
      offset,
      has_more,
      sort,
      // 告诉前端：本次是降级返回（筛选未生效），避免你误以为筛选有效
      debug: { degraded: true, filtersWanted },
      filters: { difficulty, access, topic, channel },
    });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data || []).map(normRow);
  const total = typeof count === "number" ? count : null;
  const has_more = total == null ? items.length === limit : offset + limit < total;

  return NextResponse.json({
    items,
    total,
    limit,
    offset,
    has_more,
    sort,
    filters: { difficulty, access, topic, channel },
  });
}
