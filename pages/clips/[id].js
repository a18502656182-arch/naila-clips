// pages/clips/[id].js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

/**
 * ✅ 功能结构对齐你的 WP 版本：
 * - 顶部栏：返回 / 标题 / pills / 完成按钮
 * - 左：视频 + 浮层控制条（-5 / 播放 / +5 / 进度 / 倍速 / 全屏）
 * - 中：字幕列表（唯一滚动区域），EN/中开关，点击跳转播放，3×循环
 * - 词卡：
 *    - 桌面：右侧面板（tab：单词/短语/表达；显示释义开关；卡片展开/收藏/发音/定位字幕）
 *    - 手机：底部抽屉
 *
 * ✅ UI：参考 englishclips 风格（卡片化、留白、统一按钮），但不 1:1 复刻
 */

const DEMO = {
  title: "酒店美食体验",
  difficulty: "中级",
  // 你后续接 Supabase 时，把这里换成 clip.video_url / cover_url
  video_url: "https://media.nailaobao.top/video1.mp4",
};

// ======= 你的演示字幕/词卡数据（先照搬） =======
const transcript = [
  { t: 0, en: "[Music]", cn: "（音乐）" },
  { t: 26, en: "All right, good morning. I woke up early.", cn: "早上好，我起得很早。" },
  { t: 30, en: "Monday — start of the week.", cn: "周一，一周的开始。" },
  { t: 36, en: "I went back to see if they had some.", cn: "我又回去看看他们有没有。" },
  { t: 40, en: "This morning I'm on a quest to go find some eggs.", cn: "今天早上我就要去找鸡蛋。" },
  { t: 42, en: "Honestly, it's kind of tough right now.", cn: "说实话现在有点难搞。" },
  { t: 49, en: "No way — I found some. Let's go, thank you!", cn: "不会吧，我找到了。走吧，谢谢你！" },
  { t: 60, en: "All right, I secured the eggs — random spot, but we got it.", cn: "好，我搞到鸡蛋了，地方很随机，但总算拿到了。" },
];

const vocabDB = {
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
      note: "适合用在“费了点劲终于达成目标”的场景，比如抢到票、订到餐厅、买到断货商品。secured 强调结果拿下；random spot 补充过程意外；but we got it 表达“过程不重要，结果到手”。",
    },
    {
      key: "Honestly, it's kind of tough right now.",
      cn: "说实话，现在确实有点难搞。",
      sentence: "Honestly, it's kind of tough right now.",
      sentence_cn: "说实话，现在确实有点难搞。",
      note: "honestly 让语气更真实像聊天；kind of tough 很口语，适合描述：找不到东西、排队太久、系统卡住、推进困难等。",
    },
    {
      key: "No way — I found some!",
      cn: "不会吧——我居然找到了！",
      sentence: "No way — I found some!",
      sentence_cn: "不会吧——我居然找到了！",
      note: "No way 表惊讶/不敢相信，适合突然的好消息：补货、有人取消、以为丢了又找到等。",
    },
  ],
};

const highlightMap = {
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

// ======= 小工具 =======
function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ":" + String(s).padStart(2, "0");
}

function isEmailLike(s) {
  return /.+@.+\..+/.test(String(s || "").trim());
}

export default function ClipDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  // 后续接真实数据：这里会变成从 /api/clip?id=xx 拉
  const clip = DEMO;

  const videoRef = useRef(null);

  const [duration, setDuration] = useState(NaN);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [rateIndex, setRateIndex] = useState(1);
  const rates = useMemo(() => [0.75, 1, 1.25, 1.5, 2], []);
  const rateLabel = rates[rateIndex] + "x";

  const [showEN, setShowEN] = useState(true);
  const [showCN, setShowCN] = useState(true);

  // active line
  const [activeIdx, setActiveIdx] = useState(0);

  // loop3 state
  const loopRef = useRef(null); // {start,end,left}

  // vocab panel/drawer
  const [vocabOpen, setVocabOpen] = useState(false);
  const [vocabTab, setVocabTab] = useState("word"); // word/phrase/native
  const [showExplain, setShowExplain] = useState(true);

  const [favorites, setFavorites] = useState(() => new Set());
  const [openState, setOpenState] = useState(() => new Map()); // key -> boolean open/close

  // responsive
  const [isDesktop, setIsDesktop] = useState(false);

  // ======= highlight render (React nodes) =======
  const highlightEntries = useMemo(() => {
    return Object.keys(highlightMap).sort((a, b) => b.length - a.length);
  }, []);

  function renderWithHighlights(text) {
    const raw = String(text || "");
    if (!raw) return null;

    // 用“最长优先”的简易扫描
    let nodes = [raw];

    highlightEntries.forEach((phrase) => {
      const key = highlightMap[phrase];
      const next = [];
      nodes.forEach((n) => {
        if (typeof n !== "string") {
          next.push(n);
          return;
        }
        const parts = n.split(phrase);
        if (parts.length === 1) {
          next.push(n);
          return;
        }
        parts.forEach((p, idx) => {
          if (p) next.push(p);
          if (idx !== parts.length - 1) {
            next.push(
              <button
                key={`${phrase}-${key}-${idx}-${Math.random()}`}
                type="button"
                className="hl"
                onClick={() => {
                  openVocab();
                  focusVocabByKey(key);
                }}
                title="点我打开词卡"
              >
                {phrase}
              </button>
            );
          }
        });
      });
      nodes = next;
    });

    return nodes.map((n, i) => (typeof n === "string" ? <span key={i}>{n}</span> : n));
  }

  // ======= transcript helpers =======
  function getEndTime(i) {
    const next = transcript[i + 1]?.t;
    return typeof next === "number" ? next : null;
  }

  function seekTo(time) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(isFinite(v.duration) ? v.duration : time, time));
    v.play?.();
  }

  function jump(delta) {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration;
    if (!isFinite(d)) return;
    v.currentTime = Math.max(0, Math.min(d, (v.currentTime || 0) + delta));
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play?.();
    else v.pause?.();
  }

  function cycleRate() {
    const v = videoRef.current;
    if (!v) return;
    setRateIndex((x) => {
      const next = (x + 1) % rates.length;
      v.playbackRate = rates[next];
      return next;
    });
  }

  async function toggleFullscreen() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        const container = v.closest(".videoCard") || v;
        await container.requestFullscreen();
      }
    } catch {
      alert("当前浏览器不支持全屏或被限制。");
    }
  }

  // ======= vocab helpers =======
  function ensureDefaultOpen(list) {
    setOpenState((prev) => {
      const next = new Map(prev);
      list.forEach((v) => {
        if (!next.has(v.key)) next.set(v.key, true);
      });
      return next;
    });
  }

  function openVocab() {
    setVocabOpen(true);
  }
  function closeVocab() {
    setVocabOpen(false);
  }

  function speakWord(word) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function focusVocabByKey(key) {
    if (!key) return;
    const tabs = ["word", "phrase", "native"];
    for (const t of tabs) {
      const list = vocabDB[t] || [];
      if (list.find((x) => x.key === key)) {
        setVocabTab(t);
        setTimeout(() => {
          const sel = isDesktop
            ? `.vocabDesktop .vcard[data-vkey="${CSS.escape(key)}"]`
            : `.vocabMobile .vcard[data-vkey="${CSS.escape(key)}"]`;
          const el = document.querySelector(sel);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
        break;
      }
    }
  }

  // ======= effects =======
  useEffect(() => {
    function onResize() {
      const m = window.matchMedia("(min-width: 1024px)");
      setIsDesktop(!!m.matches);
      if (!m.matches) {
        // 切到手机时，把桌面面板状态收一下（避免错位）
        // 但不强制关闭 vocabOpen：让用户体验一致
      }
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // init rate
    v.playbackRate = rates[rateIndex];

    function onLoaded() {
      setDuration(v.duration);
    }
    function onTime() {
      const t = v.currentTime || 0;
      setCur(t);

      // active line
      let idx = 0;
      for (let i = 0; i < transcript.length; i++) {
        if (transcript[i].t <= t) idx = i;
        else break;
      }
      setActiveIdx(idx);

      // loop3
      const ls = loopRef.current;
      if (ls && t >= ls.end - 0.03) {
        ls.left -= 1;
        if (ls.left > 0) {
          v.currentTime = ls.start;
          v.play?.();
        } else {
          loopRef.current = null;
        }
      }
    }
    function onPlay() {
      setPlaying(true);
    }
    function onPause() {
      setPlaying(false);
    }

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);

    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [rates, rateIndex]);

  // init counts + default open
  useEffect(() => {
    ensureDefaultOpen([...(vocabDB.word || []), ...(vocabDB.phrase || []), ...(vocabDB.native || [])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // progress value 0..1000
  const p1000 = useMemo(() => {
    if (!isFinite(duration) || duration <= 0) return 0;
    return Math.max(0, Math.min(1000, Math.round((cur / duration) * 1000)));
  }, [cur, duration]);

  function seekBy1000(val) {
    const v = videoRef.current;
    if (!v) return;
    if (!isFinite(v.duration) || v.duration <= 0) return;
    const p = Math.max(0, Math.min(1000, Number(val))) / 1000;
    v.currentTime = p * v.duration;
  }

  // top pills
  const memberPill = "非会员"; // 后续接 /api/me 决定：会员/非会员

  const listForTab = vocabDB[vocabTab] || [];
  const counts = {
    word: (vocabDB.word || []).length,
    phrase: (vocabDB.phrase || []).length,
    native: (vocabDB.native || []).length,
  };

  return (
    <div className="page">
      {/* Topbar */}
      <div className="topbar">
        <div className="topinner">
          <div className="left">
            <button className="iconBtn" type="button" onClick={() => router.back()} aria-label="back">
              ←
            </button>

            <div className="titleBox">
              <div className="title">{clip?.title || `Clip #${id || "-"}`}</div>
              <div className="pills">
                <span className="pill pillBlue">时长 {isFinite(duration) ? fmtTime(duration) : "--:--"}</span>
                <span className="pill">{clip?.difficulty || "难度 -"}</span>
                <span className="pill pillGreen">{memberPill}</span>
              </div>
            </div>
          </div>

          <button className="primaryBtn" type="button" onClick={() => alert("已完成（演示按钮，后端下一步接）")}>
            ✓ 已完成
          </button>
        </div>
      </div>

      {/* Content grid */}
      <div className={`grid ${vocabOpen && isDesktop ? "gridOpen" : ""}`}>
        {/* Video column */}
        <div className="videoCard">
          <div className="videoWrap">
            <video ref={videoRef} className="video" preload="metadata" playsInline>
              <source src={clip?.video_url} type="video/mp4" />
            </video>

            {/* video overlay controls */}
            <div className="vctrl">
              <button className="miniBtn" type="button" onClick={() => jump(-5)}>
                -5
              </button>
              <button className="miniBtn" type="button" onClick={togglePlay}>
                {playing ? "❚❚" : "▶"}
              </button>
              <button className="miniBtn" type="button" onClick={() => jump(5)}>
                +5
              </button>

              <input
                className="range"
                type="range"
                min="0"
                max="1000"
                value={p1000}
                onChange={(e) => seekBy1000(e.target.value)}
              />

              <div className="time">
                {fmtTime(cur)} / {isFinite(duration) ? fmtTime(duration) : "--:--"}
              </div>

              <button className="chipBtn" type="button" onClick={cycleRate}>
                {rateLabel}
              </button>
              <button className="chipBtn" type="button" onClick={toggleFullscreen}>
                全屏
              </button>
            </div>
          </div>

          {/* mobile bottom controls */}
          <div className="bottomBar">
            <div className="bottomInner">
              <input
                className="range"
                type="range"
                min="0"
                max="1000"
                value={p1000}
                onChange={(e) => seekBy1000(e.target.value)}
              />
              <div className="bottomRow">
                <button className="playBig" type="button" onClick={togglePlay}>
                  {playing ? "暂停" : "播放"}
                </button>
                <button className="chipBtn" type="button" onClick={cycleRate}>
                  {rateLabel}
                </button>
                <button className="chipBtn" type="button" onClick={openVocab}>
                  词卡
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript column */}
        <div className="mid">
          <div className="toolbar">
            <div className="toolLeft">
              <div className="toolTitle">字幕</div>
              <div className="toggles">
                <button className={`toggle ${showEN ? "on" : ""}`} type="button" onClick={() => setShowEN((x) => !x)}>
                  EN
                </button>
                <button className={`toggle ${showCN ? "on" : ""}`} type="button" onClick={() => setShowCN((x) => !x)}>
                  中
                </button>
              </div>
            </div>

            <button className="ghostBtn" type="button" onClick={openVocab}>
              查看词汇卡片
            </button>
          </div>

          <div className="scroll">
            <div className="lines">
              {transcript.map((row, i) => {
                const end = getEndTime(i);
                const active = i === activeIdx;

                return (
                  <div
                    key={i}
                    className={`line ${active ? "active" : ""}`}
                    onClick={(e) => {
                      const act = e.target?.dataset?.act;
                      if (act === "loop3") {
                        const start = row.t;
                        const end2 = end != null ? end : isFinite(duration) ? duration : start + 6;
                        loopRef.current = { start, end: end2, left: 3 };
                        seekTo(start);
                        return;
                      }

                      // 点击字幕跳转
                      loopRef.current = null;
                      seekTo(row.t);
                    }}
                  >
                    <div className="lineTop">
                      <div className="ts">
                        {fmtTime(row.t)}
                        {end != null ? ` – ${fmtTime(end)}` : ""}
                      </div>
                      <button className="loopBtn" type="button" data-act="loop3" onClick={(e) => e.stopPropagation()}>
                        3×
                      </button>
                    </div>

                    <div className="lineBody">
                      {showEN ? <div className="en">{renderWithHighlights(row.en)}</div> : null}
                      {showCN ? <div className="cn">{row.cn}</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop vocab panel */}
        {isDesktop ? (
          <div className={`right vocabDesktop ${vocabOpen ? "" : "hidden"}`}>
            <div className="panelHead">
              <div className="panelTitle">学习笔记</div>
              <button className="chipBtn" type="button" onClick={closeVocab}>
                关闭
              </button>
            </div>

            <div className="tabs">
              {["word", "phrase", "native"].map((t) => (
                <button
                  key={t}
                  className={`tab ${vocabTab === t ? "on" : ""}`}
                  type="button"
                  onClick={() => setVocabTab(t)}
                >
                  {t === "word" ? "单词" : t === "phrase" ? "短语" : "表达"} <span className="count">{counts[t]}</span>
                </button>
              ))}
            </div>

            <div className="tools">
              <button className={`explain ${showExplain ? "" : "off"}`} type="button" onClick={() => setShowExplain((x) => !x)}>
                <span>显示释义</span>
                <span className="dot" />
              </button>
            </div>

            <div className="cards">
              <VocabCards
                list={listForTab}
                vocabTab={vocabTab}
                showExplain={showExplain}
                favorites={favorites}
                setFavorites={setFavorites}
                openState={openState}
                setOpenState={setOpenState}
                onSpeak={speakWord}
                onJump={(key) => {
                  // 定位字幕：用“包含”匹配
                  const idx = transcript.findIndex((r) =>
                    String(r.en || "").toLowerCase().includes(String(key || "").toLowerCase())
                  );
                  if (idx >= 0) {
                    closeVocab();
                    seekTo(transcript[idx].t);
                    setTimeout(() => {
                      const el = document.querySelector(`.line:nth-child(${idx + 1})`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 80);
                  } else {
                    alert("示例字幕里没找到这个词（你可以把它加入字幕里）。");
                  }
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Mobile vocab drawer */}
      {!isDesktop ? (
        <>
          <div className={`overlay ${vocabOpen ? "show" : ""}`} onClick={closeVocab} />
          <div className={`drawer vocabMobile ${vocabOpen ? "open" : ""}`}>
            <div className="drawerCard">
              <div className="drawerHead">
                <div className="panelTitle">学习笔记</div>
                <button className="chipBtn" type="button" onClick={closeVocab}>
                  完成
                </button>
              </div>

              <div className="tabs">
                {["word", "phrase", "native"].map((t) => (
                  <button
                    key={t}
                    className={`tab ${vocabTab === t ? "on" : ""}`}
                    type="button"
                    onClick={() => setVocabTab(t)}
                  >
                    {t === "word" ? "单词" : t === "phrase" ? "短语" : "表达"} <span className="count">{counts[t]}</span>
                  </button>
                ))}
              </div>

              <div className="tools">
                <button className={`explain ${showExplain ? "" : "off"}`} type="button" onClick={() => setShowExplain((x) => !x)}>
                  <span>显示释义</span>
                  <span className="dot" />
                </button>
              </div>

              <div className="cards">
                <VocabCards
                  list={listForTab}
                  vocabTab={vocabTab}
                  showExplain={showExplain}
                  favorites={favorites}
                  setFavorites={setFavorites}
                  openState={openState}
                  setOpenState={setOpenState}
                  onSpeak={speakWord}
                  onJump={(key) => {
                    const idx = transcript.findIndex((r) =>
                      String(r.en || "").toLowerCase().includes(String(key || "").toLowerCase())
                    );
                    if (idx >= 0) {
                      closeVocab();
                      seekTo(transcript[idx].t);
                      setTimeout(() => {
                        const el = document.querySelector(`.line:nth-child(${idx + 1})`);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 80);
                    } else {
                      alert("示例字幕里没找到这个词（你可以把它加入字幕里）。");
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}

      <style jsx>{`
        :global(html, body) {
          background: #f6f7fb;
        }
        .page {
          min-height: 100vh;
          color: #111827;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC",
            "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
        }

        /* Topbar */
        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #e5e7eb;
        }
        .topinner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .iconBtn {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #f3f4f6;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }
        .titleBox {
          min-width: 0;
        }
        .title {
          font-weight: 900;
          font-size: 15px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 66vw;
        }
        .pills {
          display: flex;
          gap: 6px;
          margin-top: 6px;
          align-items: center;
          flex-wrap: nowrap;
          overflow: hidden;
        }
        .pill {
          font-size: 11px;
          color: #6b7280;
          border: 1px solid #e5e7eb;
          background: #fff;
          padding: 3px 9px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .pillBlue {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1e40af;
        }
        .pillGreen {
          background: #ecfdf5;
          border-color: #bbf7d0;
          color: #065f46;
        }
        .primaryBtn {
          border: none;
          background: #0ea5e9;
          color: #fff;
          padding: 10px 14px;
          border-radius: 999px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(14, 165, 233, 0.18);
          white-space: nowrap;
        }

        /* Grid */
        .grid {
          max-width: 1280px;
          margin: 0 auto;
          padding: 14px;
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .grid {
            padding: 16px;
            grid-template-columns: 1.15fr 0.85fr 0fr;
            align-items: start;
          }
          .gridOpen {
            grid-template-columns: 0.95fr 0.75fr 0.65fr;
            transition: grid-template-columns 0.25s ease;
          }
        }

        /* Video card */
        .videoCard {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(17, 24, 39, 0.06);
        }
        @media (min-width: 1024px) {
          .videoCard {
            position: sticky;
            top: 72px;
          }
        }
        .videoWrap {
          position: relative;
          background: #0b1220;
        }
        .video {
          width: 100%;
          display: block;
          max-height: 520px;
          background: #0b1220;
        }

        /* Overlay controls */
        .vctrl {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          background: rgba(0, 0, 0, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 16px;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          backdrop-filter: blur(10px);
        }
        .miniBtn {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-weight: 900;
          cursor: pointer;
          user-select: none;
        }
        .range {
          width: 100%;
          min-width: 0;
        }
        .time {
          font-variant-numeric: tabular-nums;
          color: #fff;
          font-size: 12px;
          opacity: 0.95;
          white-space: nowrap;
        }
        .chipBtn {
          border: 1px solid #e5e7eb;
          background: #fff;
          padding: 8px 12px;
          border-radius: 999px;
          cursor: pointer;
          font-weight: 900;
          font-size: 12px;
          white-space: nowrap;
        }
        .ghostBtn {
          border: 1px solid #e5e7eb;
          background: #f3f4f6;
          padding: 9px 14px;
          border-radius: 999px;
          cursor: pointer;
          font-weight: 900;
          font-size: 12px;
          white-space: nowrap;
        }
        .chipBtn:hover,
        .ghostBtn:hover {
          filter: brightness(0.98);
        }

        @media (max-width: 420px) {
          .time {
            display: none;
          }
          .vctrl {
            left: 10px;
            right: 10px;
            bottom: 10px;
            padding: 9px;
            gap: 8px;
          }
          .miniBtn {
            width: 28px;
            height: 28px;
          }
          .chipBtn {
            padding: 7px 10px;
          }
        }

        /* Bottom bar (mobile only) */
        .bottomBar {
          display: block;
          padding: 12px 12px 14px;
          border-top: 1px solid #e5e7eb;
          background: rgba(255, 255, 255, 0.98);
        }
        .bottomInner {
          display: grid;
          gap: 10px;
        }
        .bottomRow {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .playBig {
          flex: 1;
          border: none;
          background: #0ea5e9;
          color: #fff;
          border-radius: 999px;
          padding: 10px 14px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(14, 165, 233, 0.18);
        }
        @media (min-width: 1024px) {
          .bottomBar {
            display: none;
          }
        }

        /* Transcript */
        .mid {
          min-height: 0;
        }
        @media (min-width: 1024px) {
          .mid {
            position: sticky;
            top: 72px;
            height: calc(100vh - 88px);
            display: flex;
            flex-direction: column;
            min-height: 0;
          }
        }
        .toolbar {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 18px 18px 0 0;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 10px 25px rgba(17, 24, 39, 0.05);
        }
        .toolLeft {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .toolTitle {
          font-size: 12px;
          font-weight: 900;
          color: #9ca3af;
        }
        .toggles {
          display: flex;
          gap: 8px;
        }
        .toggle {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          border: none;
          background: #f3f4f6;
          color: #6b7280;
          font-weight: 900;
          font-size: 11px;
          cursor: pointer;
        }
        .toggle.on {
          background: #0ea5e9;
          color: #fff;
          box-shadow: 0 6px 14px rgba(14, 165, 233, 0.22);
        }

        .scroll {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 18px 18px;
          overflow: auto;
          min-height: 0;
          padding-bottom: 10px;
          box-shadow: 0 10px 25px rgba(17, 24, 39, 0.05);
        }
        @media (min-width: 1024px) {
          .scroll {
            height: 100%;
          }
        }

        .lines {
          padding: 8px 14px;
          display: flex;
          flex-direction: column;
        }
        .line {
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
        }
        .lineTop {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #9ca3af;
          font-size: 12px;
          font-weight: 700;
        }
        .ts {
          font-variant-numeric: tabular-nums;
        }
        .loopBtn {
          margin-left: auto;
          border: none;
          background: transparent;
          color: #9ca3af;
          font-weight: 900;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 10px;
        }
        .loopBtn:hover {
          background: #f3f4f6;
          color: #111827;
        }
        .lineBody {
          margin-top: 6px;
        }
        .en {
          font-size: 16px;
          line-height: 1.55;
          color: #1f2937;
          font-weight: 750;
          letter-spacing: 0.1px;
        }
        .cn {
          margin-top: 7px;
          font-size: 14px;
          line-height: 1.45;
          color: #6b7280;
          font-weight: 600;
          letter-spacing: 0.1px;
        }
        .line.active .en {
          color: #0ea5e9;
          font-weight: 900;
        }

        .hl {
          border: none;
          background: transparent;
          padding: 0;
          margin: 0 2px;
          color: #f97316;
          cursor: pointer;
          text-decoration: underline dotted;
          text-underline-offset: 3px;
          font-weight: 900;
        }

        /* Vocab panel (desktop) */
        .right {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(17, 24, 39, 0.06);
          height: calc(100vh - 88px);
          position: sticky;
          top: 72px;
          min-width: 320px;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .right.hidden {
          display: none;
        }
        .panelHead {
          padding: 12px 14px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .panelTitle {
          font-weight: 900;
        }
        .tabs {
          display: flex;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid #e5e7eb;
          background: #fff;
        }
        .tab {
          flex: 1 1 0;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 12px;
          padding: 9px 0;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #374151;
        }
        .tab.on {
          background: #111827;
          border-color: #111827;
          color: #fff;
        }
        .count {
          min-width: 18px;
          height: 18px;
          line-height: 18px;
          padding: 0 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.18);
          font-size: 11px;
          font-weight: 900;
        }
        .tools {
          padding: 10px 12px 12px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
        }
        .explain {
          border: none;
          background: #10b981;
          color: #fff;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .explain.off {
          background: #e5e7eb;
          color: #111827;
        }
        .dot {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #fff;
        }
        .cards {
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding: 12px;
          background: #f6f7fb;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Mobile drawer */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.25);
          z-index: 70;
          display: none;
        }
        .overlay.show {
          display: block;
        }
        .drawer {
          position: fixed;
          left: 0;
          right: 0;
          bottom: -100%;
          z-index: 71;
          transition: bottom 0.25s ease;
          max-height: 56vh;
          overflow: hidden;
          padding: 0 10px;
        }
        .drawer.open {
          bottom: 10px;
        }
        .drawerCard {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 -10px 28px rgba(17, 24, 39, 0.12);
        }
        .drawerHead {
          padding: 12px 14px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        /* Make sure transcript is primary scroll on mobile too */
        @media (max-width: 1023px) {
          .grid {
            padding-bottom: 90px;
          }
        }
      `}</style>
    </div>
  );
}

function VocabCards({
  list,
  vocabTab,
  showExplain,
  favorites,
  setFavorites,
  openState,
  setOpenState,
  onSpeak,
  onJump,
}) {
  return (
    <>
      {list.map((v) => {
        const fav = favorites.has(v.key);
        const isNative = vocabTab === "native";
        const isOpen = openState.get(v.key) !== false;

        return (
          <div key={v.key} className={`vcard ${isOpen ? "open" : ""}`} data-vkey={v.key}>
            <div className="vtop">
              <div>
                <div className="word">{v.key}</div>
                {v.ipa ? <div className="ipa">{v.ipa}</div> : null}
              </div>

              <div className="btns">
                {!isNative ? (
                  <button className="ic" type="button" title="发音" onClick={() => onSpeak?.(v.key)}>
                    🔊
                  </button>
                ) : null}
                <button
                  className="ic"
                  type="button"
                  title="收藏"
                  onClick={() => {
                    setFavorites((prev) => {
                      const next = new Set(prev);
                      next.has(v.key) ? next.delete(v.key) : next.add(v.key);
                      return next;
                    });
                  }}
                >
                  {fav ? "❤️" : "🤍"}
                </button>
                <button className="ic" type="button" title="定位到字幕" onClick={() => onJump?.(v.key)}>
                  📍
                </button>
                <button
                  className="ic"
                  type="button"
                  title="展开/收起"
                  onClick={() => {
                    setOpenState((prev) => {
                      const next = new Map(prev);
                      next.set(v.key, !isOpen);
                      return next;
                    });
                  }}
                >
                  {isOpen ? "▴" : "▾"}
                </button>
              </div>
            </div>

            {isOpen ? (
              <div className="vbody">
                {isNative ? (
                  <>
                    <div className="ex">{v.sentence || v.key}</div>
                    {showExplain ? <div className="excn">{v.sentence_cn || v.cn || ""}</div> : null}
                    {showExplain ? <div className="note">{v.note || ""}</div> : null}
                  </>
                ) : (
                  <>
                    {showExplain ? <div className="def">{v.cn || ""}</div> : null}
                    <div className="ex">{v.ex || ""}</div>
                    {showExplain ? <div className="excn">{v.ex_cn || ""}</div> : null}
                  </>
                )}
              </div>
            ) : null}

            <style jsx>{`
              .vcard {
                border: 1px solid #e5e7eb;
                border-radius: 14px;
                padding: 12px;
                background: #fff;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
              }
              .vtop {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
              }
              .word {
                font-weight: 900;
                font-size: 17px;
                color: #0f172a;
              }
              .ipa {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 4px;
              }
              .btns {
                display: flex;
                gap: 8px;
                align-items: center;
                flex-wrap: nowrap;
              }
              .ic {
                border: none;
                background: #f3f4f6;
                border-radius: 999px;
                width: 34px;
                height: 34px;
                cursor: pointer;
                font-size: 14px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: #6b7280;
              }
              .ic:hover {
                background: #e5e7eb;
                color: #111827;
              }
              .vbody {
                margin-top: 12px;
                display: grid;
                gap: 10px;
              }
              .def {
                font-size: 13px;
                line-height: 1.6;
                padding: 12px;
                border-radius: 12px;
                background: #fff7ed;
                border: 1px solid #fed7aa;
                color: #9a3412;
              }
              .def:before {
                content: "中文含义";
                display: block;
                font-weight: 900;
                margin-bottom: 8px;
                font-size: 12px;
                color: #c2410c;
              }
              .ex {
                font-size: 13px;
                line-height: 1.6;
                padding: 12px;
                border-radius: 12px;
                background: #eff6ff;
                border: 1px solid #bfdbfe;
                color: #1e3a8a;
              }
              .ex:before {
                content: "📘 字幕原句";
                display: block;
                font-weight: 900;
                margin-bottom: 8px;
                font-size: 12px;
                color: #1e40af;
              }
              .excn {
                font-size: 13px;
                line-height: 1.6;
                padding: 12px;
                border-radius: 12px;
                background: #fff;
                border: 1px solid #e5e7eb;
                color: #374151;
              }
              .excn:before {
                content: "CN 中文翻译";
                display: block;
                font-weight: 900;
                margin-bottom: 8px;
                font-size: 12px;
                color: #6b7280;
              }
              .note {
                font-size: 13px;
                line-height: 1.7;
                padding: 12px;
                border-radius: 12px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                color: #334155;
              }
              .note:before {
                content: "💡 使用场景";
                display: block;
                font-weight: 900;
                margin-bottom: 8px;
                font-size: 12px;
                color: #0f172a;
              }
            `}</style>
          </div>
        );
      })}
    </>
  );
}
