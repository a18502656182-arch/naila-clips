export default async function handler(req, res) {
  try {
    const { difficulty = "beginner", access = "free" } = req.query;

    // 先返回一个固定结果，验证路由没问题
    return res.status(200).json({
      ok: true,
      difficulty,
      access,
      message: "API 路由 OK ✅",
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
