// pages/api/auth/callback.js
import { createSupabaseForPagesApi } from "../../../utils/supabase/pagesApiClient";

export default async function handler(req, res) {
  const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);

  const code = req.query.code;
  const next = req.query.next || "/";

  if (!code) {
    flushCookies();
    return res.redirect(String(next));
  }

  try {
    await supabase.auth.exchangeCodeForSession(String(code));
  } catch (e) {
    // ignore, still redirect
  }

  flushCookies();
  return res.redirect(String(next));
}
