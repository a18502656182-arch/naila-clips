// pages/api/auth/callback.js
import { createSupabaseForPagesApi } from "../../../utils/supabase/pagesApiClient";

export default async function handler(req, res) {
  const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);

  // 1) 交换 code => session，并写入 cookie
  const code = req.query.code;
  if (typeof code === "string") {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 2) 决定跳转到哪里（默认 /login）
  const next = typeof req.query.next === "string" ? req.query.next : "/login";

  // 安全：只允许站内路径
  const safeNext = next.startsWith("/") ? next : "/login";

  flushCookies();
  res.redirect(safeNext);
}
