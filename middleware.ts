import { NextRequest } from "next/server";
import { updateSupabaseSession } from "./utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    // 只在需要验证身份的页面执行
    "/clips/:path*",
    "/journal/:path*",
    "/bookmarks/:path*",
    "/practice/:path*",
    "/admin/:path*",
  ],
};
