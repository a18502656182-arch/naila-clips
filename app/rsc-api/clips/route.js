// app/rsc-api/clips/route.js
import { NextResponse } from "next/server";
import { proxyCoverUrl } from "../../../lib/imageUrl.js";
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
    cover_url: proxyCoverUrl(r.cover_url),
    video_url: r.video_url ?? null,
    difficulty,
    topics,
    channels,
  };
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

  // ✅ 极速：取 limit+1 条，用来判断 has_more
  const take = Math.min(limit + 1, 51);

  let q = supabase
    .from("clips_view")
    .select(
      "id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url,difficulty_slug,topic_slugs,channel_slugs"
    );

  if (access.length) {
  const expanded = [];
  for (const a of access) {
    if (a === "member") expanded.push("member", "vip");
    else expanded.push(a);
  }
  q = q.in("access_tier", Array.from(new Set(expanded)));
}
  if (difficulty.length) q = q.in("difficulty_slug", difficulty);
  if (topic.length) q = q.overlaps("topic_slugs", topic);
  if (channel.length) q = q.overlaps("channel_slugs", channel);

  q = q
    .order("created_at", { ascending: sort === "oldest" })
    .range(offset, offset + take - 1);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const has_more = rows.length > limit;
  const pageRows = has_more ? rows.slice(0, limit) : rows;

  const items = pageRows.map(normRow);

  return NextResponse.json({
    items,
    total: null, // ✅ 极速版不返回 total
    limit,
    offset,
    has_more,
    sort,
    filters: { difficulty, access, topic, channel },
  });
}
