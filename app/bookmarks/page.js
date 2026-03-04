// app/bookmarks/page.js
import { createSupabaseServerClient } from "../../utils/supabase/server";
import { cookies } from "next/headers";
import BookmarksClient from "./BookmarksClient";

export default async function BookmarksPage() {
  try {
    // 临时调试：打印服务端能读到的所有 cookie 名
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    console.log("[BookmarksPage] cookies:", allCookies.map(c => c.name));

    const supabase = createSupabaseServerClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log("[BookmarksPage] session:", session?.access_token ? "有token" : "无token", "error:", error?.message);

    const accessToken = session?.access_token || null;
    return <BookmarksClient accessToken={accessToken} />;
  } catch (e) {
    console.log("[BookmarksPage] error:", e.message);
    return <BookmarksClient accessToken={null} />;
  }
}
