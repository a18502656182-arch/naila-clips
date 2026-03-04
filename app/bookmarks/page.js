// app/bookmarks/page.js
import { cookies } from "next/headers";
import BookmarksClient from "./BookmarksClient";

export const dynamic = "force-dynamic";

function getAccessTokenFromCookies() {
  try {
    const cookieStore = cookies();
    const all = cookieStore.getAll();

    // 找 sb-xxx-auth-token cookie（支持 base64- 前缀格式）
    const authCookie = all.find(c =>
      c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );

    if (!authCookie) return null;

    let raw = authCookie.value;

    // 去掉 base64- 前缀
    if (raw.startsWith("base64-")) {
      raw = raw.slice(7);
    }

    // 解码 base64
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);

    // 支持数组格式（分块存储）和对象格式
    const session = Array.isArray(parsed) ? parsed[0] : parsed;
    return session?.access_token || null;
  } catch (e) {
    console.log("[getAccessToken] error:", e.message);
    return null;
  }
}

export default async function BookmarksPage() {
  const accessToken = getAccessTokenFromCookies();
  console.log("[BookmarksPage] accessToken:", accessToken ? "有token" : "无token");
  return <BookmarksClient accessToken={accessToken} />;
}
