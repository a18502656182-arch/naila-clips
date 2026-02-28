// pages/api/vocab_fav_add.js
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  try {
    const supabase = createServerSupabaseClient({ req, res });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user?.id) return res.status(401).json({ error: "not_logged_in" });

    const { term, clip_id, kind, data } = req.body || {};
    if (!term || !clip_id) return res.status(400).json({ error: "missing_term_or_clip_id" });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { error } = await admin
      .from("vocab_favorites")
      .upsert(
        { user_id: user.id, term: String(term).trim(), clip_id: Number(clip_id), kind: kind || "words", data: data || null },
        { onConflict: "user_id,term,clip_id" }
      );

    if (error) return res.status(500).json({ error: "insert_failed", detail: error.message });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e?.message || e) });
  }
}
