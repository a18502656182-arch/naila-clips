import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    const supabase = createPagesServerClient({ req, res });

    // ✅ 关键：把 code 换成 session，并写入 cookie
    const code = req.query.code;
    if (typeof code === "string" && code.length > 0) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return res.redirect(`/login?error=${encodeURIComponent(error.message)}`);
      }
    } else {
      // 没有 code，说明不是从邮箱链接回来的
      return res.redirect("/login?error=no_code");
    }

    // ✅ 写完 cookie 后回首页
    return res.redirect("/");
  } catch (e) {
    return res.redirect("/login?error=callback_failed");
  }
}
