// pages/api/logout.js
// Bearer token 模式下 logout 只需前端清除 localStorage，服务端无需操作
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  return res.status(200).json({ ok: true });
}
