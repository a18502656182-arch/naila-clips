// pages/clips/[id].js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ":" + String(s).padStart(2, "0");
}

function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ✅ 生成带高亮（点击打开词卡）
function applyHighlights(text, highlightMap) {
  const entries = Object.keys(highlightMap || {}).sort((a, b) => b.length - a.length);
  let out = escapeHTML(text);
  for (const phrase of entries) {
    const key = highlightMap[phrase];
    const safe = escapeHTML(phrase);
    out = out.split(safe).join(`<span class="es2-hl" data-vkey="${escapeHTML(key)}">${safe}</span>`);
  }
  return out;
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export default function ClipDetailPage() {
  const router = useRouter();
  const id = router.query.id;

  const rootRef = useRef(null);
  const videoRef = useRef(null);

  // 数据
  const [loading, setLoading] = useState(true);
  const [clip, setClip] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [vocabDB, setVocabDB] = useState({ word: [], phrase: [], native: [] });
  const [highlightMap, setHighlightMap] = useState({});

  // UI state（对齐你 WP 逻辑）
  const [showEN, setShowEN] = useState(true);
  const [showCN, setShowCN] = useState(true);

  const [rateIndex, setRateIndex] = useState(1);
  const rates = useMemo(() => [0.75, 1, 1.25, 1.5, 2], []);

  const [showExplain, setShowExplain] = useState(true);
  const [vocabTab, setVocabTab] = useState("word");
  const [favorites, setFavorites] = useState(() => new Set());
  const openStateRef = useRef(new Map()); // key -> boolean(open)

  // vocab 打开状态：桌面右侧面板 / 手机抽屉
  const [openVocabPanel, setOpenVocabPanel] = useState(false);

  // 播放/进度
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(NaN);
  const [playing, setPlaying] = useState(false);

  // active line
  const [activeIdx, setActiveIdx] = useState(0);

  // loop 3x
  const loopRef = useRef(null); // {start,end,left}

  const isDesktop = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width:1024px)").matches;
  };

  // 拉数据
  useEffect(() => {
    if (!router.isReady) return;
    if (!id) return;

    setLoading(true);
    fetchJson(`/api/clip?id=${encodeURIComponent(String(id))}`)
      .then((d) => {
        setClip(d.clip);
        setTranscript(d.transcript || []);
        setVocabDB(d.vocabDB || { word: [], phrase: [], native: [] });
        setHighlightMap(d.highlightMap || {});
      })
      .finally(() => setLoading(false));
  }, [router.isReady, id]);

  // 设置播放速率
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rates[rateIndex] || 1;
  }, [rateIndex, rates]);

  // 绑定视频事件
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoaded = () => {
      setDur(v.duration);
      setCur(v.currentTime || 0);
    };
    const onTime = () => {
      const t = v.currentTime || 0;
      setCur(t);

      // 自动 active 行
      let idx = 0;
      for (let i = 0; i < transcript.length; i++) {
        if ((transcript[i]?.t || 0) <= t) idx = i;
        else break;
      }
      setActiveIdx(idx);

      // 3x loop
      const s = loopRef.current;
      if (s && isFinite(s.end) && t >= s.end - 0.03) {
        s.left -= 1;
        if (s.left > 0) {
          v.currentTime = s.start;
          v.play();
        } else {
          loopRef.current = null;
        }
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

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
  }, [transcript]);

  // 默认全部展开
  useEffect(() => {
    const all = [...(vocabDB.word || []), ...(vocabDB.phrase || []), ...(vocabDB.native || [])];
    for (const v of all) {
      if (!openStateRef.current.has(v.key)) openStateRef.current.set(v.key, true);
    }
  }, [vocabDB]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }

  function cycleRate() {
    setRateIndex((x) => (x + 1) % rates.length);
  }

  function seekToPercent(p1000) {
    const v = videoRef.current;
    if (!v) return;
    if (!isFinite(v.duration) || v.duration <= 0) return;
    const p = Math.max(0, Math.min(1000, Number(p1000))) / 1000;
    v.currentTime = p * v.duration;
  }

  function jump(delta) {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration;
    if (!isFinite(d)) return;
    v.currentTime = Math.max(0, Math.min(d, (v.currentTime || 0) + delta));
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        const container = rootRef.current?.querySelector(".es2-videoCol") || videoRef.current;
        await container.requestFullscreen();
      }
    } catch {
      alert("当前浏览器不支持全屏或被限制。");
    }
  }

  function openVocab() {
    setOpenVocabPanel(true);
    if (rootRef.current) rootRef.current.classList.add("openVocab");
  }
  function closeVocab() {
    setOpenVocabPanel(false);
    if (rootRef.current) rootRef.current.classList.remove("openVocab");
  }

  function focusVocabByKey(key) {
    if (!key) return;
    const tabs = ["word", "phrase", "native"];
    for (const t of tabs) {
      const list = vocabDB[t] || [];
      if (list.find((x) => x.key === key)) {
        setVocabTab(t);
        openVocab();
        setTimeout(() => {
          const sel = isDesktop()
            ? `#es2VocabCardsDesktop .es2-vcard[data-vkey="${CSS.escape(key)}"]`
            : `#es2VocabCards .es2-vcard[data-vkey="${CSS.escape(key)}"]`;
          const el = document.querySelector(sel);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 0);
        break;
      }
    }
  }

  function speakWord(word) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function onClickTranscript(e, rowIndex) {
    const v = videoRef.current;
    if (!v) return;

    // 点击高亮词
    const hl = e.target.closest?.(".es2-hl");
    if (hl) {
      openVocab();
      focusVocabByKey(hl.getAttribute("data-vkey"));
      return;
    }

    const row = transcript[rowIndex];
    if (!row) return;

    const start = Number(row.t || 0);
    const next = transcript[rowIndex + 1]?.t;
    const end = typeof next === "number" ? next : (isFinite(v.duration) ? v.duration : start + 6);

    // 3×
    const actBtn = e.target.closest?.("[data-act]");
    if (actBtn && actBtn.dataset.act === "loop3") {
      loopRef.current = { start, end, left: 3 };
      v.currentTime = start;
      v.play();
      setActiveIdx(rowIndex);
      return;
    }

    // 普通点击跳转
    loopRef.current = null;
    v.currentTime = start;
    v.play();
    setActiveIdx(rowIndex);
  }

  function renderVocabCards(list, isNative, containerId) {
    // 仅用于 DOM key 定位（React 仍渲染卡片）
    return (
      <div className="es2-cards" id={containerId}>
        {list.map((v) => {
          const fav = favorites.has(v.key);
          const isOpen = openStateRef.current.get(v.key) !== false;

          return (
            <div key={v.key} className={"es2-vcard" + (isOpen ? " open" : "")} data-vkey={v.key}>
              <div className="es2-vtop">
                <div>
                  <div className="es2-word">{v.key}</div>
                  <div className="es2-ipa">{v.ipa || ""}</div>
                </div>

                <div className="es2-vbtns">
                  {!isNative ? (
                    <button className="es2-icbtn" type="button" title="发音" onClick={() => speakWord(v.key)}>
                      🔊
                    </button>
                  ) : null}

                  <button
                    className="es2-icbtn"
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

                  <button
                    className="es2-icbtn"
                    type="button"
                    title="定位到字幕"
                    onClick={() => {
                      const idx = transcript.findIndex((r) => String(r.en || "").toLowerCase().includes(String(v.key || "").toLowerCase()));
                      if (idx >= 0) {
                        closeVocab();
                        const vid = videoRef.current;
                        if (vid) {
                          vid.currentTime = transcript[idx].t || 0;
                          vid.play();
                        }
                        setActiveIdx(idx);
                        setTimeout(() => {
                          const el = document.querySelector(`.es2-line[data-index="${idx}"]`);
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                        }, 80);
                      } else {
                        alert("示例字幕里没找到这个词（你可以把它加入字幕里）。");
                      }
                    }}
                  >
                    📍
                  </button>

                  <button
                    className="es2-icbtn"
                    type="button"
                    title="展开/收起"
                    onClick={() => {
                      const next = !(openStateRef.current.get(v.key) !== false);
                      openStateRef.current.set(v.key, next);
                      // 触发刷新：用一个小 hack（改动 showExplain 不变但会 re-render）
                      setShowExplain((x) => x);
                    }}
                  >
                    {isOpen ? "▴" : "▾"}
                  </button>
                </div>
              </div>

              <div className="es2-vbody">
                {isNative ? (
                  <>
                    <div className="es2-ex">{v.sentence || v.key}</div>
                    {showExplain ? <div className="es2-excn">{v.sentence_cn || v.cn || ""}</div> : null}
                    {showExplain ? <div className="es2-note">{v.note || ""}</div> : null}
                  </>
                ) : (
                  <>
                    {showExplain ? <div className="es2-def">{v.cn || ""}</div> : null}
                    <div className="es2-ex">{v.ex || ""}</div>
                    {showExplain ? <div className="es2-excn">{v.ex_cn || ""}</div> : null}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const tabList = vocabDB[vocabTab] || [];
  const isNativeTab = vocabTab === "native";

  const totalWord = (vocabDB.word || []).length;
  const totalPhrase = (vocabDB.phrase || []).length;
  const totalNative = (vocabDB.native || []).length;

  const percent1000 = useMemo(() => {
    if (!isFinite(dur) || dur <= 0) return 0;
    return Math.round((cur / dur) * 1000);
  }, [cur, dur]);

  const title = clip?.title || (loading ? "加载中..." : `Clip #${id}`);

  const vipLabel = String(clip?.access_tier || "").toLowerCase() === "vip" ? "会员" : "非会员";

  return (
    <div ref={rootRef} id="english-scene-v2" className="es2">
      <style jsx>{`
        /* ========== 主题基础 ========== */
        .es2{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",Arial,sans-serif;color:#111827}
        .es2 *{box-sizing:border-box}
        :global(:root){
          --bg:#f6f7fb;
          --card:#ffffff;
          --line:#e5e7eb;
          --muted:#6b7280;
          --text:#111827;
          --blue:#0ea5e9;
          --green:#16a34a;
          --shadow:0 10px 25px rgba(17,24,39,.08);
          --r:18px;
        }

        /* ========== 全局布局：移动端只有字幕列表滚动 ========== */
        .es2-page{
          height:100vh;
          background:var(--bg);
          display:flex;
          flex-direction:column;
          overflow:hidden;
        }

        /* ========== 顶部栏 ========== */
        .es2-topbar{
          position:sticky; top:0; z-index:50;
          background:#fff;
          border-bottom:1px solid var(--line);
        }
        .es2-topinner{
          display:flex; align-items:center; justify-content:space-between;
          padding:10px 12px;
          gap:10px;
          max-width:1280px; margin:0 auto;
        }
        .es2-left{display:flex; align-items:center; gap:10px; min-width:0;}
        .es2-back{
          width:36px;height:36px;border-radius:999px;
          border:1px solid var(--line); background:#f3f4f6; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          font-size:16px;
          flex:0 0 auto;
        }
        .es2-titlebox{min-width:0}
        .es2-title{
          font-weight:800; font-size:14px;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
          max-width:58vw;
          line-height:1.2;
        }
        .es2-pills{display:flex; gap:6px; align-items:center; flex-wrap:nowrap; margin-top:4px}
        .es2-pill{
          font-size:11px; color:var(--muted);
          border:1px solid var(--line);
          background:#fff;
          padding:2px 8px;
          border-radius:999px;
          white-space:nowrap;
          line-height:1.4;
        }
        .es2-pill.blue{background:#eff6ff;border-color:#bfdbfe;color:#1e40af}
        .es2-pill.green{background:#ecfdf5;border-color:#bbf7d0;color:#065f46}
        .es2-done{
          border:none;
          background:var(--green);
          color:#fff;
          padding:10px 14px;
          border-radius:999px;
          font-weight:800;
          cursor:pointer;
          flex:0 0 auto;
        }

        /* ========== 视频区 ========== */
        .es2-videoWrap{
          background:#0b1220;
          border-bottom:1px solid var(--line);
          position:relative;
        }
        .es2-video{
          width:100%;
          display:block;
          max-height:42vh;
          background:#0b1220;
        }

        /* 视频内控制条 */
        .es2-vctrl{
          position:absolute;
          left:10px; right:10px; bottom:10px;
          padding:8px 10px;
          border-radius:14px;
          background:rgba(0,0,0,.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display:flex;
          align-items:center;
          gap:10px;
          z-index:5;
        }
        .es2-vctrl-row1,
        .es2-vctrl-row2{display:flex; align-items:center; gap:10px}
        .es2-vctrl-row1{flex:1; min-width:0}
        .es2-vctrl-row2{flex:0 0 auto}
        .es2-vctrl-btn{
          width:28px; height:28px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.22);
          background:rgba(255,255,255,.08);
          color:#fff;
          cursor:pointer;
          font-weight:900;
          display:flex; align-items:center; justify-content:center;
          user-select:none;
          font-size:12px;
          flex:0 0 auto;
        }
        .es2-vctrl-row1 input[type="range"]{
          width:100%;
          min-width:0;
        }
        .es2-vctrl-time{
          font-variant-numeric: tabular-nums;
          opacity:.95;
          font-size:12px;
          white-space:nowrap;
          color:#fff;
        }
        .es2-vctrl-right{display:flex; align-items:center; gap:8px}
        .es2-vctrl-chip{
          border:1px solid rgba(255,255,255,.22);
          background:rgba(255,255,255,.08);
          color:#fff;
          padding:6px 10px;
          border-radius:999px;
          cursor:pointer;
          font-weight:900;
          font-size:12px;
          user-select:none;
          white-space:nowrap;
        }
        @media (max-width:420px){
          .es2-vctrl{left:8px; right:8px; padding:7px 8px; gap:8px}
          .es2-vctrl-btn{width:26px;height:26px}
          .es2-vctrl-chip{padding:6px 8px}
          .es2-vctrl-time{display:none}
        }

        /* ========== 桌面三栏容器 + 手机滚动修复关键 ========== */
        .es2-wrapDesktop{
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .es2-wrapDesktop > div:nth-child(2){
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        /* ========== 字幕工具条 ========== */
        .es2-transcriptToolbar{
          height:56px;
          background:#fff;
          border-bottom:1px solid var(--line);
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:0 16px;
          flex-shrink:0;
          gap:10px;
        }
        .es2-toolbarLeft{display:flex; align-items:center; gap:10px;}
        .es2-toolbarTitle{
          font-size:12px;
          font-weight:700;
          color:#9ca3af;
        }
        .es2-toggleGroup{display:flex; gap:8px; align-items:center;}
        .es2-toggle{
          width:28px;height:28px;
          border-radius:999px;
          border:none;
          font-size:10px;
          font-weight:800;
          cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition:all .2s ease;
          background:#f3f4f6;
          color:#6b7280;
          padding:0;
        }
        .es2-toggle.on{
          background:var(--blue);
          color:#fff;
          box-shadow:0 2px 6px rgba(14,165,233,.28);
        }
        .es2-vocabViewBtn{
          border:none;
          background:#f3f4f6;
          color:#111827;
          padding:8px 16px;
          border-radius:999px;
          font-size:12px;
          cursor:pointer;
          font-weight:700;
          white-space:nowrap;
          transition:background .2s ease;
        }
        .es2-vocabViewBtn:hover{background:#e5e7eb}

        /* ========== 字幕滚动区：唯一可滚动 ========== */
        .es2-scroll{
          flex:1;
          min-height:0;
          overflow:auto;
          -webkit-overflow-scrolling:touch;
          background:#fff;
          padding:0;
          padding-bottom:84px;
        }
        .es2-card{
          background:#fff;
          border:none;
          border-radius:0;
          box-shadow:none;
          max-width:1280px;
          margin:0 auto;
        }
        .es2-lines{
          padding:8px 16px;
          display:flex;
          flex-direction:column;
          gap:0;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .es2-line{
          background:transparent;
          border:none;
          border-bottom:1px solid #f1f5f9;
          border-radius:0;
          padding:12px 0;
          display:flex;
          flex-direction:column;
          gap:6px;
          cursor:pointer;
        }
        .es2-lineTop{
          display:flex;
          align-items:center;
          justify-content:flex-start;
          gap:10px;
          color:#9ca3af;
          font-size:12px;
          font-weight:600;
        }
        .es2-ts{
          font-size:12px;
          color:#9ca3af;
          font-variant-numeric: tabular-nums;
          min-width:44px;
        }
        .es2-mini{
          margin-left:auto;
          border:none;
          background:transparent;
          padding:4px 6px;
          border-radius:10px;
          font-size:12px;
          cursor:pointer;
          white-space:nowrap;
          color:#9ca3af;
          font-weight:700;
        }
        .es2-text{
          font-size:16px;
          color:#1f2937;
          line-height:1.55;
          word-break:break-word;
          font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
          font-weight:650;
          letter-spacing:.1px;
        }
        .es2-cn{
          margin-top:6px;
          font-size:14px;
          color:#6b7280;
          line-height:1.45;
          word-break:break-word;
          font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
          font-weight:550;
          letter-spacing:.1px;
        }
        .es2-line.active .es2-text{color:var(--blue); font-weight:800;}
        .es2-hl{
          background:transparent;
          border:none;
          padding:0;
          border-radius:0;
          color:#f97316;
          text-decoration: underline dotted;
          text-underline-offset:3px;
          cursor:pointer;
          margin:0 2px;
        }

        /* ========== 底部固定悬浮条 ========== */
        .es2-bottomBar{
          position:fixed; left:0; right:0; bottom:0;
          z-index:60;
          background:rgba(255,255,255,.98);
          border-top:1px solid var(--line);
          padding:8px 16px 10px;
        }
        .es2-bottomInner{
          max-width:1280px;
          margin:0 auto;
        }
        .es2-progressRow{display:flex; align-items:center; gap:10px; padding-bottom:8px;}
        .es2-progressRow input[type="range"]{width:100%}
        .es2-controlRow{display:flex; align-items:center; gap:10px;}
        .es2-playBig{
          flex:1;
          background:var(--blue);
          border:none;
          color:#fff;
          font-weight:800;
          font-size:15px;
          padding:10px 14px;
          border-radius:999px;
          cursor:pointer;
          box-shadow:0 6px 14px rgba(14,165,233,.22);
        }
        .es2-rightBtns{display:flex; gap:10px; align-items:center; flex:0 0 auto;}
        .es2-chip{
          border:1px solid var(--line);
          background:#fff;
          padding:9px 12px;
          border-radius:999px;
          cursor:pointer;
          font-weight:800;
          font-size:12px;
          min-width:54px;
          text-align:center;
        }

        /* ========== 词卡：移动端抽屉 + 桌面右侧面板 ========== */
        .es2-overlay{position:fixed; inset:0; background:rgba(0,0,0,.25); z-index:70; display:none;}
        .es2-overlay.show{display:block}
        .es2-drawer{position:fixed; left:0; right:0; bottom:-100%; z-index:71; transition:bottom .25s ease; max-height:52vh; overflow:hidden;}
        .es2-drawer.open{bottom:0}
        .es2-drawerCard{
          max-width:1280px;
          margin:0 auto;
          background:#fff;
          border:1px solid var(--line);
          border-radius:22px 22px 0 0;
          box-shadow:0 -10px 28px rgba(17,24,39,.12);
          overflow:hidden;
        }
        .es2-drawerHead{
          display:flex; align-items:center; justify-content:space-between;
          padding:14px 16px;
          border-bottom:1px solid var(--line);
          font-weight:900;
          background:#fff;
        }
        .es2-tabs{
          display:flex;
          gap:10px;
          padding:10px 16px 0;
          flex-wrap:nowrap;
          overflow:hidden;
          background:#fff;
        }
        .es2-tab{
          border:1px solid var(--line);
          background:#f9fafb;
          padding:9px 0;
          border-radius:12px;
          font-size:12px;
          cursor:pointer;
          font-weight:800;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:6px;
          white-space:nowrap;
          flex:1 1 0;
          color:#374151;
        }
        .es2-tab.on{
          background:#111827;
          border-color:#111827;
          color:#fff;
        }
        .es2-tabCount{
          display:inline-block;
          min-width:18px;
          height:18px;
          line-height:18px;
          text-align:center;
          border-radius:999px;
          background:rgba(255,255,255,.14);
          border:1px solid rgba(255,255,255,.18);
          color:inherit;
          font-size:11px;
          font-weight:900;
          padding:0 6px;
        }
        .es2-drawerTools{
          padding:10px 16px 12px;
          display:flex; justify-content:flex-end; align-items:center; gap:10px; flex-wrap:wrap;
          background:#fff;
          border-bottom:1px solid var(--line);
        }
        .es2-toggleExplain{
          border:none;
          background:#10b981;
          color:#fff;
          padding:6px 10px;
          border-radius:999px;
          font-size:11px;
          font-weight:900;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          gap:6px;
          user-select:none;
        }
        .es2-toggleExplain.off{
          background:#e5e7eb;
          color:#111827;
        }
        .es2-toggleExplain .dot{
          width:14px;height:14px;border-radius:999px;
          background:#fff;
          display:inline-block;
        }
        .es2-toggleExplain.off .dot{
          background:#fff;
          box-shadow:inset 0 0 0 2px rgba(0,0,0,.08);
        }
        .es2-cards{
          padding:14px 16px 16px;
          overflow:auto;
          max-height:34vh;
          display:flex; flex-direction:column; gap:14px;
          background:var(--bg);
        }
        .es2-vcard{
          border:1px solid var(--line);
          border-radius:14px;
          padding:14px;
          background:#fff;
          box-shadow:0 1px 2px rgba(0,0,0,.04);
        }
        .es2-vtop{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:10px
        }
        .es2-word{
          font-weight:900;
          font-size:18px;
          color:#0f172a;
        }
        .es2-ipa{font-size:12px;color:#94a3b8;margin-top:4px}
        .es2-vbtns{
          display:flex;
          align-items:center;
          gap:10px;
          flex-wrap:nowrap;
          justify-content:flex-end;
          flex:0 0 auto;
        }
        .es2-icbtn{
          border:none;
          background:#f3f4f6;
          border-radius:999px;
          width:34px;
          height:34px;
          cursor:pointer;
          font-size:14px;
          display:flex;
          align-items:center;
          justify-content:center;
          user-select:none;
          color:#6b7280;
        }
        .es2-icbtn:hover{background:#e5e7eb;color:#111827}
        .es2-vbody{display:none; margin-top:12px}
        .es2-vcard.open .es2-vbody{display:block}
        .es2-def{
          font-size:13px;
          line-height:1.6;
          padding:12px 12px;
          border-radius:12px;
          background:#fff7ed;
          border:1px solid #fed7aa;
          color:#9a3412;
          position:relative;
        }
        .es2-def::before{
          content:"中文含义";
          display:block;
          font-weight:900;
          margin-bottom:8px;
          font-size:12px;
          color:#c2410c;
        }
        .es2-ex{
          margin-top:12px;
          padding:12px 12px;
          border-radius:12px;
          background:#eff6ff;
          border:1px solid #bfdbfe;
          color:#1e3a8a;
          font-size:13px;
          line-height:1.6;
        }
        .es2-ex::before{
          content:"📘 字幕原句";
          display:block;
          font-weight:900;
          margin-bottom:8px;
          font-size:12px;
          color:#1e40af;
        }
        .es2-excn{
          margin-top:10px;
          padding:12px 12px;
          border-radius:12px;
          background:#fff;
          border:1px solid var(--line);
          color:#374151;
          font-size:13px;
          line-height:1.6;
        }
        .es2-excn::before{
          content:"CN 中文翻译";
          display:block;
          font-weight:900;
          color:#6b7280;
          margin-bottom:8px;
          font-size:12px;
        }
        .es2-note{
          margin-top:10px;
          padding:12px 12px;
          border-radius:12px;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          color:#334155;
          font-size:13px;
          line-height:1.7;
        }
        .es2-note::before{
          content:"💡 使用场景";
          display:block;
          font-weight:900;
          margin-bottom:8px;
          font-size:12px;
          color:#0f172a;
        }

        /* ========== 桌面端：三栏布局 + 右侧词卡面板 ========== */
        @media (min-width:1024px){
          .es2-page{height:auto; overflow:visible}
          .es2-video{max-height:520px}

          .es2-wrapDesktop{
            max-width:1280px;
            margin:0 auto;
            display:grid;
            grid-template-columns: 1.18fr 0.82fr 0fr;
            gap:16px;
            padding:16px;
            align-items:start;
          }
          .es2-videoCol{
            position:sticky; top:72px;
            border:1px solid var(--line);
            border-radius:18px;
            overflow:hidden;
            box-shadow:0 8px 20px rgba(0,0,0,.06);
            background:#fff;
          }
          .es2-videoWrap{border-bottom:none}
          .es2-transcriptToolbar{
            position:sticky; top:72px; z-index:10;
            border:1px solid var(--line);
            border-radius:18px 18px 0 0;
            box-shadow:0 8px 18px rgba(0,0,0,.05);
          }
          .es2-scroll{
            padding:0;
            overflow:visible;
            border:1px solid var(--line);
            border-top:none;
            border-radius:0 0 18px 18px;
            box-shadow:0 8px 18px rgba(0,0,0,.05);
          }
          .es2-bottomBar{display:none}

          .es2-vpanel{
            border:1px solid var(--line);
            border-radius:18px;
            background:#fff;
            box-shadow:0 8px 18px rgba(0,0,0,.05);
            overflow:hidden;
            height: calc(100vh - 88px);
            position:sticky;
            top:72px;
            min-width:320px;
          }
          .es2-vpanelHead{
            padding:14px 16px;
            border-bottom:1px solid var(--line);
            display:flex; align-items:center; justify-content:space-between;
            font-weight:900;
            background:#fff;
          }
          .es2-vpanelBody{padding:0; overflow:auto; height: calc(100% - 56px); background:var(--bg);}
          .es2-vpanelBody .es2-tabs{border-bottom:1px solid var(--line)}
          .es2-vpanelBody .es2-drawerTools{border-bottom:1px solid var(--line)}
          .es2-vpanelBody .es2-cards{max-height:none}
          :global(.es2.openVocab) .es2-wrapDesktop{
            grid-template-columns: 0.98fr 0.78fr 0.70fr;
            transition: grid-template-columns .25s ease;
          }
        }

        /* 小提示 */
        .es2-tip{
          margin: 12px auto 0;
          max-width: 1280px;
          padding: 0 16px;
          color: #6b7280;
          font-size: 12px;
        }

        .es2-paywall{
          margin: 10px auto 0;
          max-width: 1280px;
          padding: 12px 16px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fff;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
        }
        .es2-paywall a{
          text-decoration:none;
          font-weight:800;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background:#111;
          color:#fff;
          white-space:nowrap;
        }
      `}</style>

      <div className="es2-page">
        {/* 顶部栏 */}
        <div className="es2-topbar">
          <div className="es2-topinner">
            <div className="es2-left">
              <button className="es2-back" type="button" onClick={() => router.back()}>
                ←
              </button>
              <div className="es2-titlebox">
                <div className="es2-title">{title}</div>
                <div className="es2-pills">
                  <span className="es2-pill blue">时长 {isFinite(dur) ? fmtTime(dur) : "--:--"}</span>
                  <span className="es2-pill">难度 {clip?.difficulty_slugs?.[0] || "未知"}</span>
                  <span className="es2-pill green">{vipLabel}</span>
                </div>
              </div>
            </div>
            <button className="es2-done" type="button" onClick={() => alert("已完成（演示按钮，后端未接）")}>
              ✓ 已完成
            </button>
          </div>
        </div>

        {/* 会员不可看提示 */}
        {clip && !clip.can_access ? (
          <div className="es2-paywall">
            <div style={{ fontWeight: 800, color: "#111827" }}>会员专享内容：请登录并兑换码激活会员</div>
            <a href="/login">去登录/兑换</a>
          </div>
        ) : null}

        <div className="es2-wrapDesktop">
          {/* 左：视频 */}
          <div className="es2-videoCol">
            <div className="es2-videoWrap">
              <video
                ref={videoRef}
                className="es2-video"
                preload="metadata"
                playsInline
                controls={false}
                // ✅ 会员不可看时：不给 src（防止直接播放）
              >
                {clip?.can_access ? <source src={clip?.video_url || ""} type="video/mp4" /> : null}
              </video>

              {/* 视频内控制条 */}
              <div className="es2-vctrl">
                <div className="es2-vctrl-row1">
                  <button className="es2-vctrl-btn" type="button" onClick={() => jump(-5)}>-5</button>
                  <button className="es2-vctrl-btn" type="button" onClick={togglePlay}>
                    {playing ? "❚❚" : "▶"}
                  </button>
                  <button className="es2-vctrl-btn" type="button" onClick={() => jump(+5)}>+5</button>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={percent1000}
                    onChange={(e) => seekToPercent(e.target.value)}
                  />
                </div>

                <div className="es2-vctrl-row2">
                  <span className="es2-vctrl-time">{fmtTime(cur)} / {fmtTime(dur)}</span>
                  <div className="es2-vctrl-right">
                    <button className="es2-vctrl-chip" type="button" onClick={cycleRate}>
                      {rates[rateIndex]}x
                    </button>
                    <button className="es2-vctrl-chip" type="button" onClick={toggleFullscreen}>
                      全屏
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="es2-tip">提示：点击字幕跳转；右上角「3×」会把这一句循环听 3 次；点橙色下划线词可打开词卡。</div>
          </div>

          {/* 中：字幕 */}
          <div>
            <div className="es2-transcriptToolbar">
              <div className="es2-toolbarLeft">
                <div className="es2-toolbarTitle">字幕</div>
                <div className="es2-toggleGroup">
                  <button className={"es2-toggle " + (showEN ? "on" : "")} type="button" onClick={() => setShowEN((x) => !x)}>
                    EN
                  </button>
                  <button className={"es2-toggle " + (showCN ? "on" : "")} type="button" onClick={() => setShowCN((x) => !x)}>
                    中
                  </button>
                </div>
              </div>
              <button className="es2-vocabViewBtn" type="button" onClick={openVocab}>
                查看词汇卡片
              </button>
            </div>

            <div className="es2-scroll">
              <div className="es2-card">
                <div className="es2-lines">
                  {transcript.map((row, i) => {
                    const next = transcript[i + 1]?.t;
                    const end = typeof next === "number" ? next : null;

                    return (
                      <div
                        key={i}
                        className={"es2-line" + (i === activeIdx ? " active" : "")}
                        data-index={i}
                        onClick={(e) => onClickTranscript(e, i)}
                      >
                        <div className="es2-lineTop">
                          <div className="es2-ts">
                            {fmtTime(row.t)}
                            {end != null ? ` – ${fmtTime(end)}` : ""}
                          </div>

                          <button className="es2-mini" type="button" data-act="loop3" onClick={(e) => onClickTranscript(e, i)}>
                            3×
                          </button>
                        </div>

                        <div>
                          {showEN ? (
                            <div
                              className="es2-text"
                              dangerouslySetInnerHTML={{ __html: applyHighlights(row.en, highlightMap) }}
                              onClick={(e) => {
                                // 防止点高亮 span 时被父层吞掉
                                const hl = e.target.closest?.(".es2-hl");
                                if (hl) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  focusVocabByKey(hl.getAttribute("data-vkey"));
                                }
                              }}
                            />
                          ) : null}

                          {showCN ? <div className="es2-cn">{row.cn || ""}</div> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 右：桌面词卡面板 */}
          <div className="es2-vpanel" style={{ display: openVocabPanel && isDesktop() ? "block" : "none" }}>
            <div className="es2-vpanelHead">
              <span>学习笔记</span>
              <button className="es2-chip" type="button" onClick={closeVocab}>关闭</button>
            </div>

            <div className="es2-vpanelBody">
              <div className="es2-tabs">
                <button className={"es2-tab " + (vocabTab === "word" ? "on" : "")} type="button" onClick={() => setVocabTab("word")}>
                  单词 <span className="es2-tabCount">{totalWord}</span>
                </button>
                <button className={"es2-tab " + (vocabTab === "phrase" ? "on" : "")} type="button" onClick={() => setVocabTab("phrase")}>
                  短语 <span className="es2-tabCount">{totalPhrase}</span>
                </button>
                <button className={"es2-tab " + (vocabTab === "native" ? "on" : "")} type="button" onClick={() => setVocabTab("native")}>
                  表达 <span className="es2-tabCount">{totalNative}</span>
                </button>
              </div>

              <div className="es2-drawerTools">
                <button
                  className={"es2-toggleExplain " + (!showExplain ? "off" : "")}
                  type="button"
                  onClick={() => setShowExplain((x) => !x)}
                >
                  <span>显示释义</span><span className="dot" />
                </button>
              </div>

              {renderVocabCards(tabList, isNativeTab, "es2VocabCardsDesktop")}
            </div>
          </div>
        </div>

        {/* 移动端底部悬浮条 */}
        <div className="es2-bottomBar">
          <div className="es2-bottomInner">
            <div className="es2-progressRow">
              <input type="range" min="0" max="1000" value={percent1000} onChange={(e) => seekToPercent(e.target.value)} />
            </div>
            <div className="es2-controlRow">
              <button className="es2-playBig" type="button" onClick={togglePlay}>
                {playing ? "暂停" : "播放"}
              </button>
              <div className="es2-rightBtns">
                <button className="es2-chip" type="button" onClick={cycleRate}>
                  {rates[rateIndex]}x
                </button>
                <button className="es2-chip" type="button" onClick={openVocab}>
                  词卡
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 移动端词卡抽屉 */}
        <div className={"es2-overlay " + (openVocabPanel && !isDesktop() ? "show" : "")} onClick={closeVocab} />
        <div className={"es2-drawer " + (openVocabPanel && !isDesktop() ? "open" : "")}>
          <div className="es2-drawerCard">
            <div className="es2-drawerHead">
              <span>学习笔记</span>
              <button className="es2-chip" type="button" onClick={closeVocab}>
                完成
              </button>
            </div>

            <div className="es2-tabs">
              <button className={"es2-tab " + (vocabTab === "word" ? "on" : "")} type="button" onClick={() => setVocabTab("word")}>
                单词 <span className="es2-tabCount">{totalWord}</span>
              </button>
              <button className={"es2-tab " + (vocabTab === "phrase" ? "on" : "")} type="button" onClick={() => setVocabTab("phrase")}>
                短语 <span className="es2-tabCount">{totalPhrase}</span>
              </button>
              <button className={"es2-tab " + (vocabTab === "native" ? "on" : "")} type="button" onClick={() => setVocabTab("native")}>
                表达 <span className="es2-tabCount">{totalNative}</span>
              </button>
            </div>

            <div className="es2-drawerTools">
              <button
                className={"es2-toggleExplain " + (!showExplain ? "off" : "")}
                type="button"
                onClick={() => setShowExplain((x) => !x)}
              >
                <span>显示释义</span><span className="dot" />
              </button>
            </div>

            {renderVocabCards(tabList, isNativeTab, "es2VocabCards")}
          </div>
        </div>

        {loading ? <div className="es2-tip">加载中...</div> : null}
      </div>
    </div>
  );
}
