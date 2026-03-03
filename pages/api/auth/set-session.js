// pages/api/auth/set-session.js
import { createSupabaseForPagesApi } from "../../../utils/supabase/pagesApiClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { access_token, refresh_token } = req.body || {};
    if (!access_token || !refresh_token) {
      return res.status(400).json({ error: "Missing tokens" });
    }

    const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);

    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      flushCookies();
      return res.status(400).json({ error: error.message });
    }

    flushCookies();
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
