// app/bookmarks/page.js — 服务端组件，用 cookie session 调 railway
import { createSupabaseServerClient } from "../../utils/supabase/server";
import BookmarksClient from "./BookmarksClient";

const RAILWAY = "https://railway.nailaobao.top";

async function getInitialData(token) {
  const headers = { Authorization: `Bearer ${token}` };
  const [videosRes, vocabRes, meRes] = await Promise.all([
    fetch(`${RAILWAY}/api/bookmarks?limit=100`, { headers, cache: "no-store" }),
    fetch(`${RAILWAY}/api/vocab_favorites`, { headers, cache: "no-store" }),
    fetch(`${RAILWAY}/api/me`, { headers, cache: "no-store" }),
  ]);
  const [videosData, vocabData, meData] = await Promise.all([
    videosRes.ok ? videosRes.json() : { items: [] },
    vocabRes.ok ? vocabRes.json() : { items: [] },
    meRes.ok ? meRes.json() : { logged_in: false },
  ]);
  return {
    videoItems: videosData.items || [],
    vocabItems: vocabData.items || [],
    me: meData,
  };
}

export default async function BookmarksPage() {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || null;

    if (!token) {
      return <BookmarksClient initialVideos={[]} initialVocab={[]} initialMe={{ logged_in: false }} />;
    }

    const { videoItems, vocabItems, me } = await getInitialData(token);
    return <BookmarksClient initialVideos={videoItems} initialVocab={vocabItems} initialMe={me} />;
  } catch {
    return <BookmarksClient initialVideos={[]} initialVocab={[]} initialMe={null} />;
  }
}
