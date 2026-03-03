// pages/api/logout.js
import { serialize } from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // 清除 Cookie（把过期时间设为过去，浏览器会自动删除）
  res.setHeader("Set-Cookie", [
    serialize("sb_access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }),
    serialize("sb_refresh_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }),
  ]);

  return res.status(200).json({ ok: true });
}
