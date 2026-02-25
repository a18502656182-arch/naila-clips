// pages/api/auth/callback.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  const supabase = createPagesServerClient({ req, res });

  // 1) 交换 code => session，并写入 cookie
  const code = req.query.code;
  if (typeof code === "string") {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 2) 决定跳转到哪里（默认 /login）
  const next = typeof req.query.next === "string" ? req.query.next : "/login";

  // 安全：只允许站内路径
  const safeNext = next.startsWith("/") ? next : "/login";

  res.redirect(safeNext);
}
