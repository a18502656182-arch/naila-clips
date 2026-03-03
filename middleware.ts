import { NextRequest, NextResponse } from "next/server";
import { updateSupabaseSession } from "./utils/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // 先刷新 session（保持登录状态）
  const response = await updateSupabaseSession(request);

  const { pathname } = request.nextUrl;

  // 只拦截视频详情页 /clips/[id]
  if (pathname.startsWith("/clips/")) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {}, // middleware 里只读不写
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // 未登录 → 跳转到登录页，并带上来源地址方便登录后跳回
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 已登录但是否是会员，交给页面内部的 clip_full API 判断
    // （因为 middleware 不方便查数据库，会员校验在 clip_full.js 里已经做了）
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
