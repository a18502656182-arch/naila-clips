import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    const supabase = createPagesServerClient({ req, res });

    // 这一步会把 session 写入 cookie（关键）
    await supabase.auth.getSession();

    // 成功后回到首页（你也可以改成 /login）
    res.redirect("/");
  } catch (e) {
    res.redirect("/login?error=callback_failed");
  }
}
