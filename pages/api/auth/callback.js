// pages/api/auth/callback.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  const supabase = createPagesServerClient({ req, res });

  // ✅ 核心：把 ?code=... 换成 session，并写入 cookie
  const code = req.query.code;

  if (typeof code === "string") {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 登录完成后跳回 /login（或首页都行）
  res.redirect("/login");
}
