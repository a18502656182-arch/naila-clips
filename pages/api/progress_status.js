import { createSupabaseForPagesApi } from "../../utils/supabase/pagesApiClient";

function getBearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
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
    if (req.method !== "GET") return send(405, { error: "method_not_allowed" });

    // ✅ 兼容：如果前端还在传 Bearer token，也能用
    const token = getBearer(req);
    const { data, error } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
    const user = data?.user || null;

    if (!user) return send(401, { error: "not_logged_in", detail: error?.message || null });

    const clipIdRaw = req.query.clip_id ?? req.query.id ?? null;
    const clip_id = clipIdRaw ? Number(clipIdRaw) : NaN;
    if (!clip_id || Number.isNaN(clip_id)) return send(400, { error: "missing_clip_id" });

    // ✅ 你项目的进度表名/字段名如果不同，下一步我会按你真实表结构再精确对齐
    // 先用最常见的 progress 表结构：progress(user_id, clip_id, is_done, updated_at)
    const { data: row, error: e1 } = await supabase
      .from("progress")
      .select("user_id, clip_id, is_done, updated_at")
      .eq("user_id", user.id)
      .eq("clip_id", clip_id)
      .maybeSingle();

    if (e1) return send(500, { error: "progress_query_failed", detail: e1.message });

    return send(200, { ok: true, clip_id, is_done: row?.is_done ?? false });
  } catch (e) {
    return send(500, { error: e?.message || "Unknown error" });
  }
}
