// pages/api/clip_details.js
import { createSupabaseForPagesApi } from "../../utils/supabase/pagesApiClient";

function parseList(v) {
  if (!v) return [];
  if (Array.isArray(v)) v = v.join(",");
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function handler(req, res) {
  try {
    const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);

    const id = Number(req.query.id || req.query.clip_id);
    if (!id) {
      flushCookies();
      return res.status(400).json({ error: "Missing id" });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // membership 逻辑（保留原逻辑）
    let is_member = false;
    if (user) {
      const { data: subRow } = await supabase
        .from("subscriptions")
        .select("status, plan, ends_at, expires_at")
        .eq("user_id", user.id)
        .order("ends_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (subRow && subRow.status === "active") {
        const endAt = subRow.ends_at || subRow.expires_at || null;
        if (!endAt) {
          is_member = true;
        } else {
          const endMs = new Date(endAt).getTime();
          if (!Number.isNaN(endMs) && endMs > Date.now()) is_member = true;
        }
      }
    }

    // clip + taxonomies
    const { data: clip, error: e1 } = await supabase
      .from("clips")
      .select(
        `
        id, title, description, duration_sec, created_at, upload_time,
        access_tier, cover_url, video_url,
        clip_taxonomies(taxonomies(type, slug))
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (e1) {
      flushCookies();
      return res.status(500).json({ error: e1.message });
    }
    if (!clip) {
      flushCookies();
      return res.status(404).json({ error: "Clip not found" });
    }

    const can_access = clip.access_tier === "free" ? true : is_member;

    // clip_details.details_json（保留原逻辑）
    const { data: detailRow, error: e2 } = await supabase
      .from("clip_details")
      .select("details_json")
      .eq("clip_id", id)
      .maybeSingle();

    if (e2) {
      flushCookies();
      return res.status(500).json({ error: e2.message });
    }

    let details_json = detailRow?.details_json ?? null;
    if (typeof details_json === "string") {
      try {
        details_json = JSON.parse(details_json);
      } catch {
        details_json = null;
      }
    }

    flushCookies();
    return res.status(200).json({
      clip: { ...clip, can_access },
      details_json,
      is_member,
      selected: {
        difficulty: parseList(req.query.difficulty),
        access: parseList(req.query.access),
        topic: parseList(req.query.topic),
        channel: parseList(req.query.channel),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
