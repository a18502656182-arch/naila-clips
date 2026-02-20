import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  const supabase = createPagesServerClient({ req, res });

  // 这句会把 magic link 带回来的 code 换成 session，并写入 cookie
  const { error } = await supabase.auth.exchangeCodeForSession(req.query);

  if (error) {
    return res.redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // 成功后随便跳回首页或工具页
  return res.redirect(`/`);
}
