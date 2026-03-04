// app/bookmarks/page.js — 和参考站完全一样：服务端只传 accessToken，不预加载数据
import { createSupabaseServerClient } from "../../utils/supabase/server";
import BookmarksClient from "./BookmarksClient";

export default async function BookmarksPage() {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || null;
    return <BookmarksClient accessToken={accessToken} />;
  } catch {
    return <BookmarksClient accessToken={null} />;
  }
}
