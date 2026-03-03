// pages/api/clip_details.js
import { createSupabaseForPagesApi } from "../../utils/supabase/pagesApiClient";

async function getMembership(supabase, userId) {
  const now = Date.now();

  const tryQuery = async (dateCol) => {
    const { data, error } = await supabase
      .from("subscriptions")
      .select(`status, plan, ${dateCol}`)
      .eq("user_id", userId)
      .order(dateCol, { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    return { data, error, dateCol };
  };

  let r = await tryQuery("ends_at");
  if (
    r.error &&
    String(r.error.message || "").toLowerCase().includes("column") &&
    String(r.error.message || "").includes("ends_at")
  ) {
    r = await tryQuery("expires_at");
  }

  if (r.error) return { is_member: false };
  const sub = r.data;
  if (!sub) return { is_member: false };

  const status = sub.status ?? null;
  const end_at = sub[r.dateCol] ?? null;

  if (status !== "active") return { is_member: false };
  if (!end_at) return { is_member: true }; // 长期有效
  const endMs = new Date(end_at).getTime();
  if (!Number.isNaN(endMs) && endMs > now) return { is_member: true };
  return { is_member: false };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);

  const send = (status, payload) => {
    flushCookies();
    return res.status(status).json(payload);
  };

  try {
    // ✅ 兼容 id / clip_id 两种参数名
    const raw = req.query.id ?? req.query.clip_id ?? req.query.clipId ?? null;
    const id = raw ? Number(raw) : NaN;
    if (!id || Number.isNaN(id)) return send(400, { error: "Missing id" });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let is_member = false;
    if (user?.id) {
      const m = await getMembership(supabase, user.id);
      is_member = !!m.is_member;
    }

    const { data: clip, error } = await supabase
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

    if (error) return send(500, { error: error.message });
    if (!clip) return send(404, { error: "Clip not found", id });

    const can_access = clip.access_tier === "free" ? true : Boolean(is_member);

    // ✅ 取 clip_details.details_json（严格按你 JSON 格式原样返回）
    const { data: detailRow, error: dErr } = await supabase
      .from("clip_details")
      .select("details_json")
      .eq("clip_id", id)
      .maybeSingle();

    if (dErr) return send(500, { error: dErr.message });

    // details_json 可能是 jsonb（对象）也可能是 text（字符串）——两者都兼容
    let details_json = detailRow?.details_json ?? null;
    if (typeof details_json === "string") {
      try {
        details_json = JSON.parse(details_json);
      } catch {
        details_json = null;
      }
    }

    return send(200, {
      clip: {
        ...clip,
        can_access,
      },
      details_json, // ✅ 前端就是读这个字段名
      is_member,
    });
  } catch (e) {
    return send(500, { error: e?.message || "Unknown error" });
  }
}
