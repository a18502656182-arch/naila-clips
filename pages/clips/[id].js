// pages/clips/[id].js
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const msg = (data && (data.error || data.message || data.detail)) || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function fmtSec(s) {
  const n = Number(s || 0);
  if (!Number.isFinite(n) || n < 0) return "0:00";
  const mm = Math.floor(n / 60);
  const ss = Math.floor(n % 60);
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function Pill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "1px solid #eee",
        background: active ? "#111" : "white",
        color: active ? "white" : "#111",
        borderRadius: 999,
        padding: "6px 12px",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, style }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 16,
        background: "white",
        boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SubtitleRow({ seg, active, onClick, showZh, rowRef }) {
  return (
    <div
      ref={rowRef}
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        border: active ? "1px solid #bfe3ff" : "1px solid #eee",
        background: active ? "#f3fbff" : "white",
        borderRadius: 14,
        padding: 12,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.7, whiteSpace: "nowrap" }}>
          {fmtSec(seg.start)} – {fmtSec(seg.end)}
        </div>
      </div>

      <div style={{ marginTop: 8, lineHeight: 1.55 }}>
        <div style={{ fontSize: 14, fontWeight: 900 }}>{seg.en || "-"}</div>
        {showZh ? <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>{seg.zh || "（暂无中文）"}</div> : null}
      </div>
    </div>
  );
}

function normalizeWord(w) {
  return String(w || "")
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, "")
    .replace(/’/g, "'")
    .trim();
}

const STOPWORDS = new Set([
  "the","a","an","and","or","but","to","of","in","on","at","for","from","with","as","by",
  "is","am","are","was","were","be","been","being",
  "i","you","he","she","it","we","they","me","him","her","us","them","my","your","his","its","our","their",
  "this","that","these","those",
  "do","does","did","done","doing",
  "have","has","had",
  "will","would","can","could","may","might","should","must",
  "not","no","yes",
  "so","if","then","than","because","when","while","where","what","who","why","how",
  "there","here","just","really","very","much","more","most","some","any","all",
  "up","down","out","about","into","over","under",
]);

function extractVocabFromSegments(segments, limit = 40) {
  // 简单高频词：按出现次数排序
  const freq = new Map();
  const sample = new Map(); // word -> example sentence

  for (const seg of segments || []) {
    const en = String(seg?.en || "");
    const tokens = en.split(/\s+/);
    for (const t of tokens) {
      const w = normalizeWord(t);
      if (!w) continue;
      if (w.length < 3) continue;
      if (STOPWORDS.has(w)) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
      if (!sample.has(w) && en) sample.set(w, en);
    }
  }

  const arr = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count, example: sample.get(word) || "" }));

  return arr;
}

function loadSavedVocab() {
  try {
    const raw = localStorage.getItem("vocab_saved_v1");
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x) => String(x)));
  } catch {
    return new Set();
  }
}

function saveSavedVocab(set) {
  try {
    localStorage.setItem("vocab_saved_v1", JSON.stringify(Array.from(set)));
  } catch {}
}

async function lookupDictionary(word) {
  // 免费字典：dictionaryapi.dev
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("词典查询失败");
  const data = await res.json();
  return data;
}

function pickBestMeaning(dictData) {
  // dictData 通常是数组
  const first = Array.isArray(dictData) ? dictData[0] : null;
  if (!first) return null;

  const phonetic =
    first.phonetic ||
    (Array.isArray(first.phonetics) ? first.phonetics.find((p) => p?.text)?.text : "") ||
    "";

  const audio =
    (Array.isArray(first.phonetics) ? first.phonetics.find((p) => p?.audio)?.audio : "") || "";

  const meanings = Array.isArray(first.meanings) ? first.meanings : [];
  const defs = [];
  for (const m of meanings) {
    const part = m?.partOfSpeech || "";
    const ds = Array.isArray(m?.definitions) ? m.definitions : [];
    for (const d of ds.slice(0, 2)) {
      defs.push({
        part,
        def: d?.definition || "",
        example: d?.example || "",
      });
    }
    if (defs.length >= 4) break;
  }

  return {
    word: first.word || "",
    phonetic,
    audio,
    defs,
  };
}

export default function ClipDetailPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [item, setItem] = useState(null);
  const [me, setMe] = useState(null);
  const [details, setDetails] = useState(null);

  // 页面右侧 Tab
  const [rightTab, setRightTab] = useState("subs"); // "subs" | "vocab"

  // 字幕语言
  const [subLang, setSubLang] = useState("zh"); // "en" | "zh"
  const showZhSub = subLang === "zh";

  // 学习体验
  const videoRef = useRef(null);
  const [activeSegIdx, setActiveSegIdx] = useState(-1);
  const [follow, setFollow] = useState(true);
  const [loopSeg, setLoopSeg] = useState(false);
  const [rate, setRate] = useState(1);

  const listWrapRef = useRef(null);
  const rowRefs = useRef({});

  // 词汇卡
  const [vocabQuery, setVocabQuery] = useState("");
  const [selectedWord, setSelectedWord] = useState("");
  const [selectedWordMeta, setSelectedWordMeta] = useState(null); // {word,count,example}
  const [dictLoading, setDictLoading] = useState(false);
  const [dictCard, setDictCard] = useState(null); // {word, phonetic, audio, defs}
  const [dictError, setDictError] = useState("");

  const [savedSet, setSavedSet] = useState(() => new Set()); // localStorage

  useEffect(() => {
    // 只在浏览器端加载
    setSavedSet(loadSavedVocab());
  }, []);

  const clipId = useMemo(() => {
    const raw = router.query?.id;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [router.query?.id]);

  // 拉 clip + details
  useEffect(() => {
    if (!router.isReady) return;
    if (!clipId) return;

    let mounted = true;

    async function run() {
      setLoading(true);
      setNotFound(false);
      setItem(null);
      setMe(null);
      setDetails(null);

      try {
        const d1 = await fetchJson(`/api/clip?id=${clipId}`);
        if (!mounted) return;

        const gotItem = d1?.item || null;
        setItem(gotItem);
        setMe(d1?.me || null);

        if (!gotItem) {
          setNotFound(true);
          return;
        }

        try {
          const d2 = await fetchJson(`/api/clip_details?id=${clipId}`);
          if (!mounted) return;
          setDetails(d2?.details_json ?? null);
        } catch {
          setDetails(null);
        }
      } catch (e) {
        if (!mounted) return;
        if (e?.status === 404) setNotFound(true);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [router.isReady, clipId]);

  const segments = useMemo(() => {
    const arr = details?.segments;
    return Array.isArray(arr) ? arr : [];
  }, [details]);

  const canAccess = !!item?.can_access;

  // 如果 details_json 里未来提供 vocab，就优先用它
  const vocabList = useMemo(() => {
    const fromJson = details?.vocab;
    if (Array.isArray(fromJson) && fromJson.length) {
      // 允许格式：[{word, meaning, example}] 或 ["word"]
      return fromJson
        .map((x) => {
          if (typeof x === "string") return { word: normalizeWord(x), count: 0, example: "" };
          return {
            word: normalizeWord(x?.word),
            count: Number(x?.count || 0),
            example: x?.example || "",
            meaning: x?.meaning || "",
          };
        })
        .filter((x) => x.word);
    }
    return extractVocabFromSegments(segments, 50);
  }, [details, segments]);

  const filteredVocab = useMemo(() => {
    const q = normalizeWord(vocabQuery);
    if (!q) return vocabList;
    return vocabList.filter((v) => v.word.includes(q));
  }, [vocabList, vocabQuery]);

  // 点击字幕：跳到该句并播放
  function jumpTo(seg, idx) {
    setActiveSegIdx(idx);
    const v = videoRef.current;
    if (!v) return;
    const t = Number(seg?.start || 0);
    try {
      v.currentTime = t;
      v.play?.();
    } catch {}
  }

  // 播放倍速
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.playbackRate = rate;
    } catch {}
  }, [rate]);

  // 自动高亮 + 循环（已修复版）
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!segments.length) return;

    function findActiveIdx(t) {
      for (let i = 0; i < segments.length; i++) {
        const s = Number(segments[i]?.start || 0);
        const e = Number(segments[i]?.end || 0);
        if (t >= s && t < e) return i;
      }
      return -1;
    }

    function onTime() {
      const t = v.currentTime || 0;

      const idx = findActiveIdx(t);
      if (idx !== -1 && idx !== activeSegIdx) setActiveSegIdx(idx);

      if (loopSeg && activeSegIdx !== -1) {
        const seg = segments[activeSegIdx];
        const start = Number(seg?.start || 0);
        const end = Number(seg?.end || 0);
        if (t >= end - 0.02) {
          try {
            v.currentTime = start;
            if (!v.paused) v.play?.();
          } catch {}
        }
      }
    }

    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [segments, loopSeg, activeSegIdx]);

  // 自动滚动跟随
  useEffect(() => {
    if (!follow) return;
    if (activeSegIdx < 0) return;
    const el = rowRefs.current[activeSegIdx];
    const wrap = listWrapRef.current;
    if (!el || !wrap) return;

    const top = el.offsetTop;
    const h = el.offsetHeight;
    const wh = wrap.clientHeight;
    const target = Math.max(0, top - wh * 0.35 + h * 0.5);
    wrap.scrollTo({ top: target, behavior: "smooth" });
  }, [activeSegIdx, follow]);

  // 快捷键：空格播放暂停；J/K 上一句下一句；L 循环
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const v = videoRef.current;

      if (e.code === "Space") {
        e.preventDefault();
        if (!v) return;
        try {
          if (v.paused) v.play?.();
          else v.pause?.();
        } catch {}
      }

      if (e.key === "k" || e.key === "K") {
        if (!segments.length) return;
        const next = Math.min((activeSegIdx < 0 ? 0 : activeSegIdx + 1), segments.length - 1);
        jumpTo(segments[next], next);
      }

      if (e.key === "j" || e.key === "J") {
        if (!segments.length) return;
        const prev = Math.max((activeSegIdx <= 0 ? 0 : activeSegIdx - 1), 0);
        jumpTo(segments[prev], prev);
      }

      if (e.key === "l" || e.key === "L") setLoopSeg((x) => !x);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [segments, activeSegIdx]);

  // 词汇卡：选中单词 -> 查词典
  async function openWordCard(v) {
    const w = normalizeWord(v?.word || "");
    if (!w) return;

    setRightTab("vocab");
    setSelectedWord(w);
    setSelectedWordMeta(v || null);
    setDictError("");

    // 如果 details_json.vocab 里自带 meaning，可先显示
    if (v?.meaning) {
      setDictCard({
        word: w,
        phonetic: "",
        audio: "",
        defs: [{ part: "", def: v.meaning, example: v.example || "" }],
      });
      return;
    }

    setDictLoading(true);
    setDictCard(null);

    try {
      const data = await lookupDictionary(w);
      const card = pickBestMeaning(data);
      if (!card) throw new Error("没有查到释义");
      setDictCard(card);
    } catch (e) {
      setDictError(e?.message || "查词失败");
    } finally {
      setDictLoading(false);
    }
  }

  function toggleSaveWord(w) {
    const word = normalizeWord(w);
    if (!word) return;
    setSavedSet((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      saveSavedVocab(next);
      return next;
    });
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        <div style={{ opacity: 0.7 }}>加载中...</div>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            ← 返回
          </Link>
          <div style={{ fontWeight: 950 }}>Clip #{clipId || "-"}</div>
        </div>
        <Card style={{ padding: 14, marginTop: 14 }}>未找到该视频（id={clipId || "-"}）</Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      {/* 顶部栏 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Link
          href="/"
          style={{
            border: "1px solid #eee",
            background: "white",
            borderRadius: 12,
            padding: "8px 12px",
            textDecoration: "none",
            color: "#111",
            fontWeight: 950,
          }}
        >
          ← 返回
        </Link>

        <div style={{ fontSize: 20, fontWeight: 950, flex: 1, minWidth: 220 }}>
          {item.title || `Clip #${item.id}`}
        </div>
      </div>

      {/* 主体 */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "minmax(360px, 1fr) minmax(420px, 1.1fr)",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* 播放器 */}
        <Card style={{ padding: 12, position: "sticky", top: 12 }}>
          {canAccess ? (
            <>
              <video
                ref={videoRef}
                controls
                playsInline
                style={{ width: "100%", borderRadius: 14, background: "#000" }}
                src={item.video_url}
                poster={item.cover_url || undefined}
              />

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Pill active={follow} onClick={() => setFollow((x) => !x)}>
                  自动跟随 {follow ? "ON" : "OFF"}
                </Pill>
                <Pill active={loopSeg} onClick={() => setLoopSeg((x) => !x)}>
                  循环当前句 {loopSeg ? "ON" : "OFF"}
                </Pill>

                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>倍速</div>
                  <select
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    style={{ border: "1px solid #eee", borderRadius: 12, padding: "8px 10px", fontWeight: 900 }}
                  >
                    {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                      <option key={r} value={r}>
                        {r}x
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65, lineHeight: 1.6 }}>
                快捷键：空格 播放/暂停；J 上一句；K 下一句；L 循环开关
              </div>
            </>
          ) : (
            <div
              style={{
                border: "1px solid #ffd5d5",
                background: "#fff5f5",
                borderRadius: 14,
                padding: 12,
                color: "#b00",
                fontSize: 13,
                lineHeight: 1.6,
                fontWeight: 900,
              }}
            >
              会员专享：该视频需要登录并兑换码激活后观看。
            </div>
          )}
        </Card>

        {/* 右侧：字幕 / 词汇卡 */}
        <Card style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>学习区</div>

            <div style={{ display: "flex", gap: 8, marginLeft: 6 }}>
              <Pill active={rightTab === "subs"} onClick={() => setRightTab("subs")}>
                字幕
              </Pill>
              <Pill active={rightTab === "vocab"} onClick={() => setRightTab("vocab")}>
                词汇卡
              </Pill>
            </div>

            <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>
              {me?.logged_in ? "已登录" : "未登录"} / {me?.is_member ? "会员" : "非会员"}
            </div>
          </div>

          {rightTab === "subs" ? (
            <>
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Pill active={subLang === "en"} onClick={() => setSubLang("en")}>
                  EN
                </Pill>
                <Pill active={subLang === "zh"} onClick={() => setSubLang("zh")}>
                  中
                </Pill>

                <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.65 }}>
                  提示：到「词汇卡」里点单词可查词 & 加生词本
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                {segments.length ? (
                  <div
                    ref={listWrapRef}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      maxHeight: 620,
                      overflow: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {segments.map((seg, idx) => (
                      <SubtitleRow
                        key={idx}
                        seg={seg}
                        active={idx === activeSegIdx}
                        showZh={showZhSub}
                        onClick={() => jumpTo(seg, idx)}
                        rowRef={(el) => {
                          if (el) rowRefs.current[idx] = el;
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 14,
                      padding: 12,
                      fontSize: 13,
                      opacity: 0.8,
                      lineHeight: 1.6,
                    }}
                  >
                    {details ? "details_json 里没有 segments" : "暂无详情内容（details_json）。后续把 AI 生成 JSON 写入 clip_details.details_json 即可。"}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* 词汇卡区 */}
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={vocabQuery}
                  onChange={(e) => setVocabQuery(e.target.value)}
                  placeholder="搜索单词..."
                  style={{
                    flex: 1,
                    minWidth: 200,
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontWeight: 800,
                  }}
                />
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>
                  候选词 {filteredVocab.length} / 生词本 {savedSet.size}
                </div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {/* 左：词表 */}
                <div
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 14,
                    padding: 10,
                    maxHeight: 560,
                    overflow: "auto",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900, marginBottom: 8 }}>
                    点击单词 → 打开词汇卡
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {filteredVocab.map((v) => {
                      const saved = savedSet.has(v.word);
                      const active = selectedWord === v.word;
                      return (
                        <button
                          key={v.word}
                          type="button"
                          onClick={() => openWordCard(v)}
                          style={{
                            textAlign: "left",
                            border: active ? "1px solid #bfe3ff" : "1px solid #eee",
                            background: active ? "#f3fbff" : "white",
                            borderRadius: 12,
                            padding: 10,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ fontWeight: 950 }}>{v.word}</div>
                            {typeof v.count === "number" && v.count > 0 ? (
                              <div style={{ fontSize: 12, opacity: 0.6 }}>×{v.count}</div>
                            ) : null}
                            <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
                              {saved ? "★ 已加" : "☆ 未加"}
                            </div>
                          </div>
                          {v.example ? (
                            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                              例句：{v.example}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 右：词汇卡 */}
                <div
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 14,
                    padding: 12,
                    minHeight: 200,
                  }}
                >
                  {!selectedWord ? (
                    <div style={{ opacity: 0.75, lineHeight: 1.7 }}>
                      选择一个单词后会显示词汇卡。<br />
                      （词典来自 dictionaryapi.dev）
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 20, fontWeight: 950 }}>{selectedWord}</div>
                        <div style={{ fontSize: 13, opacity: 0.7, fontWeight: 900 }}>
                          {dictCard?.phonetic ? dictCard.phonetic : ""}
                        </div>

                        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => toggleSaveWord(selectedWord)}
                            style={{
                              border: "1px solid #eee",
                              background: savedSet.has(selectedWord) ? "#111" : "white",
                              color: savedSet.has(selectedWord) ? "white" : "#111",
                              borderRadius: 12,
                              padding: "8px 10px",
                              fontWeight: 950,
                              cursor: "pointer",
                            }}
                          >
                            {savedSet.has(selectedWord) ? "已加入生词本（点移除）" : "加入生词本"}
                          </button>

                          {dictCard?.audio ? (
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  const a = new Audio(dictCard.audio);
                                  a.play?.();
                                } catch {}
                              }}
                              style={{
                                border: "1px solid #eee",
                                background: "white",
                                borderRadius: 12,
                                padding: "8px 10px",
                                fontWeight: 950,
                                cursor: "pointer",
                              }}
                            >
                              🔊 发音
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {selectedWordMeta?.example ? (
                        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
                          <div style={{ fontWeight: 950, marginBottom: 4 }}>字幕例句</div>
                          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 10, background: "#fafafa" }}>
                            {selectedWordMeta.example}
                          </div>
                        </div>
                      ) : null}

                      <div style={{ marginTop: 10 }}>
                        {dictLoading ? (
                          <div style={{ opacity: 0.75 }}>查词中...</div>
                        ) : dictError ? (
                          <div style={{ color: "#b00", fontWeight: 900, lineHeight: 1.6 }}>
                            {dictError}
                            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                              提示：如果你在国内网络，可能会被墙；后续可换成你自己的词典 API。
                            </div>
                          </div>
                        ) : dictCard?.defs?.length ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {dictCard.defs.map((d, idx) => (
                              <div key={idx} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 950 }}>
                                  {d.part ? `[${d.part}]` : "释义"}
                                </div>
                                <div style={{ marginTop: 6, fontSize: 14, fontWeight: 900, lineHeight: 1.5 }}>
                                  {d.def || "-"}
                                </div>
                                {d.example ? (
                                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8, lineHeight: 1.5 }}>
                                    例句：{d.example}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ opacity: 0.75 }}>暂无释义</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65, lineHeight: 1.6 }}>
                说明：当前“生词本”先存浏览器本地（localStorage）。下一步你如果要跨设备同步，我会带你建 Supabase 表 + API + “我的生词本”页面。
              </div>
            </>
          )}
        </Card>
      </div>

      <style jsx>{`
        @media (max-width: 980px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="position: sticky"] {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}
