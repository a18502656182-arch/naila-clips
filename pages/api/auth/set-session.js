// pages/api/auth/set-session.js
import { createSupabaseForPagesApi } from "../../../utils/supabase/pagesApiClient";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { access_token, refresh_token } = req.body || {};
    if (!access_token || !refresh_token) {
      return res.status(400).json({ error: "Missing access_token/refresh_token" });
    }

    const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);

    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    flushCookies();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
