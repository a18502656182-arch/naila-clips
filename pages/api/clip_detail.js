// pages/api/clip_detail.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "method_not_allowed" });
    }

    const id = parseInt(req.query.id || "0", 10);
    if (!id) return res.status(400).json({ error: "missing_id" });

    const supabase = createPagesServerClient({ req, res });

    const { data, error } = await supabase
      .from("clip_details")
      .select("clip_id, details_json, updated_at")
      .eq("clip_id", id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: "db_error", detail: error.message });
    }

    return res.status(200).json({
      ok: true,
      clip_id: id,
      details_json: data?.details_json || null,
      updated_at: data?.updated_at || null,
    });
  } catch (e) {
    return res.status(500).json({ error: "unknown", detail: String(e?.message || e) });
  }
}
