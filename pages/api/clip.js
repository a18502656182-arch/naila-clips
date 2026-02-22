// pages/api/clip.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

function getBearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function getUserFromReq(req, res) {
  const supabase = createPagesServerClient({ req, res });
  const token = getBearer(req);
  const { data, error } = token
    ? await supabase.auth.getUser(token) // Bearer
    : await supabase.auth.getUser(); // Cookie
  return {
    supabase,
    user: data?.user || null,
    mode: token ? "bearer" : "cookie",
    userErr: error?.message || null,
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

    const id = String(req.query.id || "").trim();
    if (!id) return res.status(400).json({ error: "missing_id" });

    const supabase = createPagesServerClient({ req, res });

    // 取 clip（你当前项目里 clips_view 更常用；如果没有就改成 clips）
    const { data: clip, error } = await supabase
      .from("clips_view")
      .select(
        "id,title,access_tier,cover_url,video_url,duration_sec,created_at,difficulty_slugs,topic_slugs,channel_slugs"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: "clip_query_failed", detail: error.message });
    if (!clip) return res.status(404).json({ error: "not_found" });

    // 登录/会员判断（复用你现有 cookie 登录态）
    const { user } = await getUserFromReq(req, res);

    // 这里的会员判断：你现在 /api/clips 已经会返回 can_access
    // 详情页我们同样用一个规则：free 任何人可看；vip 仅会员可看
    // （如果你后续在 clips_view 里已经有 can_access 字段，也可以直接用那个）
    const isVip = String(clip.access_tier || "").toLowerCase() === "vip";

    // 只要是 vip，就需要会员；free 不需要
    // “是否会员”我们从 /api/me 来做更权威，但这里先简单：
    // 如果用户已登录，我们再去 profiles 查 tier；查不到就当非会员
    let is_member = false;
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("access_tier")
        .eq("id", user.id)
        .maybeSingle();
      is_member = String(prof?.access_tier || "").toLowerCase() === "vip";
    }

    const can_access = !isVip || (user && is_member);

    // ✅ 先用默认示例字幕/词卡（后面你给我每条 clip 的数据，我们再从 Supabase 读取）
    const defaultTranscript = [
      { t: 0, en: "[Music]", cn: "（音乐）" },
      { t: 26, en: "All right, good morning. I woke up early.", cn: "早上好，我起得很早。" },
      { t: 30, en: "Monday — start of the week.", cn: "周一，一周的开始。" },
      { t: 36, en: "I went back to see if they had some.", cn: "我又回去看看他们有没有。" },
      { t: 40, en: "This morning I'm on a quest to go find some eggs.", cn: "今天早上我就要去找鸡蛋。" },
      { t: 42, en: "Honestly, it's kind of tough right now.", cn: "说实话现在有点难搞。" },
      { t: 49, en: "No way — I found some. Let's go, thank you!", cn: "不会吧，我找到了。走吧，谢谢你！" },
      { t: 60, en: "All right, I secured the eggs — random spot, but we got it.", cn: "好，我搞到鸡蛋了，地方很随机，但总算拿到了。" },
    ];

    const defaultVocabDB = {
      word: [
        { key: "secure", ipa: "/sɪˈkjʊr/", cn: "搞到；弄到；成功拿到（某物）", ex: "I secured the eggs — random spot, but we got it.", ex_cn: "我把鸡蛋搞到手了——地方很随机，但我们拿到了。" },
        { key: "quest", ipa: "/kwest/", cn: "（为寻找某物的）探索/任务；长时间寻找", ex: "I'm on a quest to go find some eggs.", ex_cn: "我正准备去“寻蛋”——去找点鸡蛋。" },
        { key: "random", ipa: "/ˈrændəm/", cn: "随机的；随便的；不固定的", ex: "It was a random spot.", ex_cn: "那是个很随机的地方。" },
        { key: "stock up", ipa: "", cn: "囤货；备货（提前买很多存起来）", ex: "I tried to stock up for the week.", ex_cn: "我打算为这一周提前囤点货。" },
      ],
      phrase: [
        { key: "no way", ipa: "", cn: "不可能吧/真的假的（表示惊讶或不敢相信）", ex: "No way — I found some!", ex_cn: "不会吧——我居然找到了！" },
        { key: "kind of", ipa: "", cn: "有点儿；稍微；某种程度上（语气变柔和）", ex: "It's kind of tough right now.", ex_cn: "现在确实有点难搞。" },
        { key: "let's go", ipa: "", cn: "走吧/出发吧（也可表示兴奋、打气）", ex: "Let's go, thank you!", ex_cn: "走吧，谢谢你！" },
        { key: "start of the week", ipa: "", cn: "一周的开始（通常指周一）", ex: "Monday — start of the week.", ex_cn: "周一——一周的开始。" },
      ],
      native: [
        {
          key: "I secured the eggs — random spot, but we got it.",
          cn: "我搞到鸡蛋了——地方很随机，但总算拿到了。",
          sentence: "I secured the eggs — random spot, but we got it.",
          sentence_cn: "我搞到鸡蛋了——地方很随机，但总算拿到了。",
          note: "适合“费了点劲终于达成目标”的场景。secured 强调结果拿下了；random spot 补充过程意外；but we got it 收尾表达“结果到手”。",
        },
        {
          key: "Honestly, it's kind of tough right now.",
          cn: "说实话，现在确实有点难搞。",
          sentence: "Honestly, it's kind of tough right now.",
          sentence_cn: "说实话，现在确实有点难搞。",
          note: "honestly 更真实；kind of tough 很口语，比 difficult 更生活化。适合描述：找不到东西、排队太久、系统卡住等。",
        },
        {
          key: "No way — I found some!",
          cn: "不会吧——我居然找到了！",
          sentence: "No way — I found some!",
          sentence_cn: "不会吧——我居然找到了！",
          note: "No way 表达惊讶/不敢相信，常搭配突然的好消息：补货、有人取消位置、东西找回等。",
        },
      ],
    };

    const defaultHighlightMap = {
      secured: "secure",
      secure: "secure",
      quest: "quest",
      random: "random",
      "stock up": "stock up",
      "no way": "no way",
      "kind of": "kind of",
      "let's go": "let's go",
      "start of the week": "start of the week",
    };

    return res.status(200).json({
      ok: true,
      clip: {
        ...clip,
        difficulty_slugs: clip.difficulty_slugs || [],
        topic_slugs: clip.topic_slugs || [],
        channel_slugs: clip.channel_slugs || [],
        can_access,
      },
      transcript: defaultTranscript,
      vocabDB: defaultVocabDB,
      highlightMap: defaultHighlightMap,
    });
  } catch (e) {
    return res.status(500).json({ error: "unknown", detail: String(e?.message || e) });
  }
}
