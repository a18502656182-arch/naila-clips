import { createSupabaseForPagesApi } from "../../utils/supabase/pagesApiClient";

export default async function handler(req, res) {
  // 字幕可以短缓存
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);
  const send = (status, payload) => {
    flushCookies();
    return res.status(status).json(payload);
  };

  try {
    if (req.method !== "GET") return send(405, { error: "method_not_allowed" });

    const raw = req.query.clip_id ?? req.query.id ?? null;
    const clip_id = raw ? Number(raw) : NaN;
    if (!clip_id || Number.isNaN(clip_id)) return send(400, { error: "missing_clip_id" });

    // 你项目里一般是 subtitles 表：subtitles(clip_id, subtitles_json)
    const { data, error } = await supabase
      .from("subtitles")
      .select("subtitles_json")
      .eq("clip_id", clip_id)
      .maybeSingle();

    if (error) return send(500, { error: error.message });

    let subtitles_json = data?.subtitles_json ?? null;
    if (typeof subtitles_json === "string") {
      try {
        subtitles_json = JSON.parse(subtitles_json);
      } catch {
        subtitles_json = null;
      }
    }

    return send(200, { ok: true, clip_id, subtitles_json });
  } catch (e) {
    return send(500, { error: e?.message || "Unknown error" });
  }
}
