"use client";
import { useState, useEffect } from "react";
import { THEME } from "../components/home/theme";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

function getToken() {
  try { return localStorage.getItem("sb_access_token") || null; } catch { return null; }
}
function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

function formatDate() {
  const now = new Date();
  const days =["日", "一", "二", "三", "四", "五", "六"];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · 周${days[now.getDay()]}`;
}

function playWord(term) {
  const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(term)}&type=2`);
  audio.onerror = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(term);
    u.lang = "en-US"; u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };
  audio.play().catch(() => {});
}

// ── 全局高级样式注入 (Bento 布局与光影动画) ──────────────────────────────
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap');
    
    * { box-sizing: border-box; }
    
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes glowPulse {
      0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }
      50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.8); }
    }
    @keyframes borderSpin {
      100% { transform: rotate(360deg); }
    }

    /* Bento Box 网格布局 */
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 24px;
      max-width: 1080px;
      margin: -60px auto 60px;
      padding: 0 20px;
      position: relative;
      z-index: 10;
    }

    .bento-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 20px 40px -12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1);
      padding: 28px;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards;
    }
    .bento-card:hover {
      transform: translateY(-4px) scale(1.01);
      box-shadow: 0 30px 60px -15px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,1);
    }

    /* 响应式占位 */
    .col-span-4 { grid-column: span 4; }
    .col-span-8 { grid-column: span 8; }
    .col-span-12 { grid-column: span 12; }
    .col-span-7 { grid-column: span 7; }
    .col-span-5 { grid-column: span 5; }

    @media (max-width: 960px) {
      .bento-grid { display: flex; flex-direction: column; gap: 20px; margin-top: -40px; }
      .bento-card { padding: 20px; border-radius: 20px; }
    }

    .hide-scroll::-webkit-scrollbar { display: none; }
    .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
    
    .text-gradient {
      background: linear-gradient(135deg, #4f46e5 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  `}} />
);

// ── 组件：顶部英雄区 (Hero) ──────────────────────────────────────────
function HeroSection({ me, doneCount }) {
  const progress = Math.round((doneCount / 3) * 100);
  return (
    <div style={{
      background: "radial-gradient(140% 120% at 50% 10%, #0f172a 0%, #020617 100%)",
      padding: "80px 20px 120px",
      position: "relative", overflow: "hidden"
    }}>
      {/* 炫酷的背景光效 */}
      <div style={{ position: "absolute", top: "-20%", left: "10%", width: "40vw", height: "40vw", background: "#4f46e5", filter: "blur(120px)", opacity: 0.2, borderRadius: "50%" }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "5%", width: "30vw", height: "30vw", background: "#db2777", filter: "blur(100px)", opacity: 0.2, borderRadius: "50%" }} />

      <div style={{ maxWidth: 1040, margin: "0 auto", position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ display: "inline-block", padding: "6px 16px", background: "rgba(255,255,255,0.1)", borderRadius: "100px", color: "#cbd5e1", fontSize: 13, fontWeight: 700, marginBottom: 16, backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)" }}>
            🗓️ {formatDate()}
          </div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-1px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            欢迎回来，<span className="text-gradient">{me?.email?.split("@")[0] || "学习者"}</span>
          </h1>
          <p style={{ fontSize: 16, color: "#94a3b8", marginTop: 8, fontWeight: 500 }}>
            语言不是学出来的，是用出来的。今天也要脱口而出。
          </p>
        </div>

        {/* 顶部环形进度 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,0.05)", padding: "16px 24px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}>
          <div style={{ position: "relative", width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: `conic-gradient(#10b981 ${progress}%, rgba(255,255,255,0.1) ${progress}%)` }}>
            <div style={{ width: 50, height: 50, background: "#0f172a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>
              {progress}%
            </div>
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>今日能量槽</div>
            <div style={{ color: "#10b981", fontSize: 13, fontWeight: 600, marginTop: 2 }}>{doneCount === 3 ? "完美通关 🎉" : `已完成 ${doneCount}/3 任务`}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 组件：统计小卡片 (Quick Stats) ──────────────────────────────────
function QuickStats({ streakDays, totalVideos, totalVocab }) {
  const stats =[
    { icon: "🔥", label: "连胜纪录", value: `${streakDays} 天`, color: "#f97316", bg: "linear-gradient(135deg, #fff7ed, #ffedd5)" },
    { icon: "🎬", label: "沉浸视频", value: `${totalVideos} 部`, color: "#4f46e5", bg: "linear-gradient(135deg, #eef2ff, #e0e7ff)" },
    { icon: "🧠", label: "词汇宇宙", value: `${totalVocab} 词`, color: "#059669", bg: "linear-gradient(135deg, #f0fdf4, #dcfce7)" },
  ];

  return (
    <>
      {stats.map((s, i) => (
        <div key={i} className="bento-card col-span-4" style={{ animationDelay: `${i * 0.1}s`, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: "18px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: "inset 0 2px 4px rgba(255,255,255,0.8)" }}>
            {s.icon}
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color, marginTop: 4, letterSpacing: "-0.5px" }}>{s.value}</div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── 组件：今日任务 (To-Do) ──────────────────────────────────────────
function TodayTasksWidget({ tasks }) {
  return (
    <div className="bento-card col-span-7" style={{ animationDelay: "0.3s", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 24 }}>🎯</span>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>每日行动指令</h2>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, justifyContent: "center" }}>
        {tasks.map((task, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 16, padding: "16px",
            background: task.done ? "#f8fafc" : "#ffffff",
            borderRadius: "20px", border: `2px solid ${task.done ? "#22c55e" : "#f1f5f9"}`,
            transition: "all 0.3s", opacity: task.done ? 0.8 : 1
          }}>
            {/* 定制复选框 */}
            <div style={{
              width: 32, height: 32, borderRadius: "10px",
              background: task.done ? "linear-gradient(135deg, #4ade80, #16a34a)" : "#f1f5f9",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: task.done ? "0 4px 12px rgba(34,197,94,0.4)" : "inset 0 2px 4px rgba(0,0,0,0.05)"
            }}>
              {task.done && <span style={{ color: "#fff", fontSize: 16, fontWeight: 900 }}>✓</span>}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: task.done ? "#15803d" : "#0f172a", textDecoration: task.done ? "line-through" : "none", textDecorationColor: "#86efac" }}>
                {task.label}
              </div>
              <div style={{ fontSize: 13, color: task.done ? "#16a34a" : "#64748b", marginTop: 4, fontWeight: 500 }}>
                {task.done ? task.doneText : task.pendingText}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 组件：记忆碎片 (Memory Flashcard) ────────────────────────────────
function MemoryWidget({ item, onRefresh, totalVocab }) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => { setFlipped(false); }, [item?.id]);

  if (!item) return <div className="bento-card col-span-5" style={{ animationDelay: "0.4s" }}><p>暂无词汇</p></div>;

  const daysSince = item.created_at ? Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000) : 0;

  return (
    <div className="bento-card col-span-5" style={{ 
      animationDelay: "0.4s", display: "flex", flexDirection: "column",
      background: "linear-gradient(145deg, #ffffff, #faf5ff)",
      border: "1px solid #f3e8ff"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🔮</span>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#4c1d95", margin: 0 }}>记忆回眸</h2>
        </div>
        <button onClick={onRefresh} style={{ background: "none", border: "none", color: "#9333ea", cursor: "pointer", fontWeight: 700, fontSize: 13, background: "#f3e8ff", padding: "6px 12px", borderRadius: "100px" }}>
          换一个 ↻
        </button>
      </div>

      <div style={{ 
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        padding: "30px 20px", background: "#ffffff", borderRadius: "20px",
        boxShadow: "0 10px 30px -10px rgba(147, 51, 234, 0.15)", border: "1px solid #f3e8ff",
        position: "relative", cursor: "pointer", transition: "all 0.4s ease"
      }} onClick={() => setFlipped(!flipped)}>
        
        {/* 点击翻转特效 */}
        <div style={{ position: "absolute", top: 12, right: 12, fontSize: 11, color: "#d8b4fe", fontWeight: 700 }}>
          {flipped ? "点击合上" : "点击翻转"}
        </div>

        {!flipped ? (
          <>
            <div style={{ fontSize: 12, color: "#9333ea", fontWeight: 800, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>
              {daysSince === 0 ? "TODAY" : `${daysSince} DAYS AGO`}
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", textAlign: "center", lineHeight: 1.1 }}>
              {item.term}
            </div>
            {item.data?.ipa && <div style={{ fontSize: 14, color: "#a855f7", marginTop: 8, fontFamily: "monospace" }}>{item.data.ipa}</div>}
            
            <button onClick={(e) => { e.stopPropagation(); playWord(item.term); }} style={{
              marginTop: 24, width: 48, height: 48, borderRadius: "50%", background: "#9333ea", color: "#fff", border: "none", fontSize: 20, cursor: "pointer",
              boxShadow: "0 8px 16px rgba(147, 51, 234, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s"
            }} onMouseOver={e => e.currentTarget.style.transform="scale(1.1)"} onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>
              ▶
            </button>
          </>
        ) : (
          <div style={{ width: "100%", animation: "fadeUp 0.3s ease" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#4c1d95", marginBottom: 12, textAlign: "center" }}>{item.data?.zh || "暂无释义"}</div>
            {item.data?.example_en && (
              <div style={{ background: "#faf5ff", padding: "16px", borderRadius: "16px", border: "1px solid #f3e8ff" }}>
                <div style={{ fontSize: 14, color: "#0f172a", fontStyle: "italic", fontWeight: 600, lineHeight: 1.5 }}>"{item.data.example_en}"</div>
                <div style={{ fontSize: 12, color: "#7e22ce", marginTop: 8, fontWeight: 500 }}>{item.data.example_zh}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 组件：热力图 (Heatmap) ──────────────────────────────────────────
function HeatmapWidget({ heatmapData }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days =[];
  for (let i = 111; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: heatmapData[d.toISOString().slice(0, 10)] || 0, d });
  }
  const pad = (days[0].d.getDay() + 6) % 7;
  const padded =[...Array(pad).fill(null), ...days];
  const weeks =[];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  function getColor(count) {
    if (count === 0) return "#f1f5f9";
    if (count === 1) return "#a7f3d0";
    if (count === 2) return "#34d399";
    if (count === 3) return "#10b981";
    return "#059669";
  }

  return (
    <div className="bento-card col-span-12" style={{ animationDelay: "0.5s", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 20 }}>🔥</span>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>打卡热力图</h2>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#64748b", fontWeight: 600 }}>Past 16 Weeks</span>
      </div>

      <div className="hide-scroll" style={{ overflowX: "auto", paddingBottom: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {week.map((day, di) => (
                <div key={di} 
                  title={day ? `${day.date}：${day.count} 视频` : ""}
                  style={{
                    width: 16, height: 16, borderRadius: "4px",
                    background: day ? getColor(day.count) : "transparent",
                    border: day?.date === today.toISOString().slice(0, 10) ? "2px solid #0f172a" : "none",
                    boxShadow: day && day.count > 0 ? "inset 0 1px 2px rgba(255,255,255,0.5)" : "none",
                    transition: "transform 0.1s ease", cursor: "pointer"
                  }}
                  onMouseOver={e => day && (e.currentTarget.style.transform = "scale(1.3)")}
                  onMouseOut={e => day && (e.currentTarget.style.transform = "scale(1)")}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 组件：能力画像 (Mastery & Topics) ────────────────────────────────
function AbilityWidget({ masteryStats, topicStats }) {
  const total = masteryStats.new + masteryStats.learning + masteryStats.mastered;
  const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className="bento-card col-span-12" style={{ animationDelay: "0.6s", display: "flex", flexWrap: "wrap", gap: 40 }}>
      {/* 左侧：词汇掌握度 */}
      <div style={{ flex: "1 1 300px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 20 }}>🧠</span>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>知识内化进度</h2>
        </div>
        
        <div style={{ height: 24, borderRadius: "100px", overflow: "hidden", display: "flex", background: "#f1f5f9", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)", marginBottom: 24 }}>
          <div style={{ width: `${pct(masteryStats.mastered)}%`, background: "linear-gradient(90deg, #10b981, #059669)", transition: "width 1s" }} />
          <div style={{ width: `${pct(masteryStats.learning)}%`, background: "linear-gradient(90deg, #3b82f6, #2563eb)", transition: "width 1s" }} />
          <div style={{ width: `${pct(masteryStats.new)}%`, background: "linear-gradient(90deg, #a855f7, #9333ea)", transition: "width 1s" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          {[
            { label: "已掌握", count: masteryStats.mastered, color: "#10b981" },
            { label: "学习中", count: masteryStats.learning, color: "#3b82f6" },
            { label: "待激活", count: masteryStats.new, color: "#a855f7" },
          ].map((b, i) => (
            <div key={i} style={{ flex: 1, padding: "16px", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: b.color, boxShadow: `0 0 10px ${b.color}` }} />
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{b.label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{b.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧：话题偏好雷达区 */}
      <div style={{ flex: "1 1 300px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 20 }}>🏷️</span>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>最爱看的话题</h2>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {topicStats.length === 0 && <p style={{color: '#94a3b8', fontSize: 14}}>暂无数据，去多看几个视频吧～</p>}
          {topicStats.map((t, i) => (
            <div key={i} style={{
              padding: "10px 16px", borderRadius: "100px",
              background: i === 0 ? "linear-gradient(135deg, #f43f5e, #e11d48)" : i === 1 ? "linear-gradient(135deg, #f59e0b, #d97706)" : "#f1f5f9",
              color: i < 2 ? "#fff" : "#475569",
              fontWeight: 800, fontSize: 14,
              boxShadow: i < 2 ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
              display: "flex", alignItems: "center", gap: 8
            }}>
              {t.label} 
              <span style={{ background: i < 2 ? "rgba(255,255,255,0.2)" : "#e2e8f0", padding: "2px 8px", borderRadius: "10px", fontSize: 11 }}>
                {t.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 主页面容器 ────────────────────────────────────────────────
export default function JournalClient({ accessToken }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [journalData, setJournalData] = useState(null);
  const [memoryItem, setMemoryItem] = useState(null);

  useEffect(() => {
    authFetch(remote("/api/me"), { cache: "no-store" })
      .then(r => r.json())
      .then(d => setMe(d))
      .catch(() => setMe({ logged_in: false }));
  },[]);

  useEffect(() => {
    if (!me) return;
    if (!me.logged_in) { setLoading(false); return; }
    loadJournalData();
  }, [me]);

  async function loadJournalData() {
    setLoading(true);
    try {
      const [journalRes, vocabRes] = await Promise.all([
        authFetch(remote("/api/journal_stats"), { cache: "no-store" }),
        authFetch(remote("/api/vocab_favorites"), { cache: "no-store" }),
      ]);
      const journal = await journalRes.json();
      const vocab = await vocabRes.json();
      const items = vocab?.items ||[];
      if (items.length > 0) setMemoryItem(items[Math.floor(Math.random() * items.length)]);
      setJournalData({ ...journal, vocabItems: items });
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function refreshMemory() {
    const items = journalData?.vocabItems ||[];
    if (items.length === 0) return;
    let next;
    do { next = items[Math.floor(Math.random() * items.length)]; }
    while (items.length > 1 && next?.id === memoryItem?.id);
    setMemoryItem(next);
  }

  if (loading || (!me || !me.logged_in)) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#64748b", fontWeight: 700 }}>努力加载数据中... (请保留旧版 loading 逻辑)</div>;
  }

  // 数据映射
  const d = journalData || {};
  const vocabItems = d.vocabItems || [];
  const tasks =[
    { label: "沉浸 1 个场景视频", done: (d.today_views || 0) >= 1, doneText: `已看 ${d.today_views || 0} 个视频`, pendingText: "去开启沉浸时刻" },
    { label: "捕获 3 个地道表达", done: (d.today_vocab || 0) >= 3, doneText: `入库 ${d.today_vocab || 0} 个词汇`, pendingText: `进度 ${d.today_vocab || 0}/3` },
    { label: "完成 1 次词汇通关", done: (d.mastered_total || 0) >= 1, doneText: `知识已巩固`, pendingText: "去收藏页完成随考" },
  ];
  const doneCount = tasks.filter(t => t.done).length;

  const masteryStats = {
    new: vocabItems.filter(v => (v.mastery_level ?? 0) === 0).length,
    learning: vocabItems.filter(v => (v.mastery_level ?? 0) === 1).length,
    mastered: vocabItems.filter(v => (v.mastery_level ?? 0) === 2).length,
  };

  const topicMap = {};
  const topicLabelMap = { "daily-life": "日常生活", "self-improvement": "个人成长", "food": "美食探店", "travel": "旅行", "business": "职场商务" };
  (d.bookmarked_topics ||[]).forEach(slug => {
    const label = topicLabelMap[slug] || slug;
    topicMap[label] = (topicMap[label] || 0) + 1;
  });
  const topicStats = Object.entries(topicMap).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <GlobalStyles />
      
      <HeroSection me={me} doneCount={doneCount} />

      {/* 核心 Bento 网格布局 */}
      <div className="bento-grid">
        <QuickStats streakDays={d.streak_days || 0} totalVideos={d.total_views || 0} totalVocab={vocabItems.length} />
        
        <TodayTasksWidget tasks={tasks} />
        <MemoryWidget item={memoryItem} onRefresh={refreshMemory} totalVocab={vocabItems.length} />
        
        <HeatmapWidget heatmapData={d.heatmap || {}} />
        <AbilityWidget masteryStats={masteryStats} topicStats={topicStats} />
      </div>

    </div>
  );
}
