// pages/api/word_lookup.js
import crypto from "crypto";

const YOUDAO_APP_ID = process.env.YOUDAO_APP_ID;
const YOUDAO_APP_SECRET = process.env.YOUDAO_APP_SECRET;
const YOUDAO_API = "https://openapi.youdao.com/v2/api";

function youdaoSign(appId, word, salt, curtime, appSecret) {
  const input = word.length <= 20
    ? word
    : word.slice(0, 10) + word.length + word.slice(-10);
  const signStr = appId + input + salt + curtime + appSecret;
  return crypto.createHash("sha256").update(signStr).digest("hex");
}

async function queryYoudao(word) {
  if (!YOUDAO_APP_ID || !YOUDAO_APP_SECRET) return null;
  try {
    const salt = Date.now().toString();
    const curtime = Math.floor(Date.now() / 1000).toString();
    const sign = youdaoSign(YOUDAO_APP_ID, word, salt, curtime, YOUDAO_APP_SECRET);
    const params = new URLSearchParams({
      q: word, from: "en", to: "zh-CHS",
      appKey: YOUDAO_APP_ID, salt, sign, signType: "v3", curtime,
    });
    const controller1 = new AbortController();
    const t1 = setTimeout(() => controller1.abort(), 5000);
    const r = await fetch(`${YOUDAO_API}?${params}`, { signal: controller1.signal });
    clearTimeout(t1);
    if (!r.ok) return null;
    const data = await r.json();
    // 调试：把完整返回记录到控制台
    console.log("Youdao response:", JSON.stringify(data));
    if (data.errorCode !== "0") {
      console.log("Youdao error code:", data.errorCode);
      return null;
    }
    // NMT 接口格式：translateResults[0].translation
    const nmtResult = data.translateResults?.[0]?.translation || "";
    return nmtResult || null;
  } catch (e) {
    console.log("Youdao exception:", e.message);
    return null;
  }
}

async function queryDictionary(word) {
  try {
    const controller2 = new AbortController();
    const t2 = setTimeout(() => controller2.abort(), 5000);
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { signal: controller2.signal });
    clearTimeout(t2);
    if (!r.ok) return null;
    const data = await r.json();
    if (!Array.isArray(data) || !data[0]) return null;
    const entry = data[0];
    const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || "";
    const audio = entry.phonetics?.find(p => p.audio)?.audio || "";
    const partOfSpeech = entry.meanings?.[0]?.partOfSpeech || "";
    return { phonetic, audio, partOfSpeech };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=86400");
  const word = (req.query.q || "").trim().toLowerCase();
  if (!word || !/^[a-z'-]+$/.test(word)) {
    return res.status(400).json({ error: "invalid_word" });
  }

  const [youdaoResult, dictResult] = await Promise.allSettled([
    queryYoudao(word),
    queryDictionary(word),
  ]);

  const zh = youdaoResult.status === "fulfilled" ? youdaoResult.value : null;
  const dict = dictResult.status === "fulfilled" ? dictResult.value : null;

  return res.status(200).json({
    word,
    phonetic: dict?.phonetic || "",
    audio: dict?.audio || "",
    partOfSpeech: dict?.partOfSpeech || "",
    zh: zh || "",
  });
}
