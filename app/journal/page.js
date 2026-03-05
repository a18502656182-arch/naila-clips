// app/journal/page.js
import { cookies } from "next/headers";
import JournalClient from "./JournalClient";

export const dynamic = "force-dynamic";

function getAccessTokenFromCookies() {
  try {
    const cookieStore = cookies();
    const all = cookieStore.getAll();
    const authCookie = all.find(c =>
      c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );
    if (!authCookie) return null;
    let raw = authCookie.value;
    if (raw.startsWith("base64-")) raw = raw.slice(7);
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    const session = Array.isArray(parsed) ? parsed[0] : parsed;
    return session?.access_token || null;
  } catch {
    return null;
  }
}

export default async function JournalPage() {
  const accessToken = getAccessTokenFromCookies();
  return <JournalClient accessToken={accessToken} />;
}
