// pages/api/clip_details.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    // 只允许 GET
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ ok: false, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 支持 ?id=1 或 ?clip_id=1
    const idRaw = req.query.id ?? req.query.clip_id;
    const clipId = Number(idRaw);

    if (!clipId || Number.isNaN(clipId)) {
      return res.status(400).json({ ok: false, error: "Missing or invalid id" });
    }

    // 读 clip_details
    const { data, error } = await supabase
      .from("clip_details")
      .select("clip_id, details_json, updated_at")
      .eq("clip_id", clipId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    // 没有也算正常：details_json=null
    return res.status(200).json({
      ok: true,
      clip_id: clipId,
      details_json: data?.details_json ?? null,
      updated_at: data?.updated_at ?? null,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
