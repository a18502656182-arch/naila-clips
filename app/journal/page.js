"use client";
import { useState, useEffect } from "react";
import { THEME } from "../components/home/theme";

// --- API 与工具函数 ---
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

// --- 全局样式 (Bento Box + 动画) ---
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 20px;
      max-width: 1000px;
      margin: -40px auto 60px;
      padding: 0 16px;
      position: relative;
      z-index: 10;
    }
    .bento-item {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      border: 1px solid rgba(11,18,32,0.06);
      box-shadow: 0 16px 32px -12px rgba(11,18,32,0.08);
      padding: 24px;
      animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .bento-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 24px 40px -12px rgba(11,18,32,0.12);
    }
    .col-span-8 { grid-column: span 8; }
    .col-span-4 { grid-column: span 4; }
    .col-span-12 { grid-column: span 12; }
    .col-span-6 { grid-column: span 6; }

    .hide-scroll::-webkit-scrollbar { display: none; }
    .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }

    @media (max-width: 960px) {
      .bento-grid { display: flex; flex-direction: column; margin-top: -20px; }
      .bento-item { padding: 20px; border-radius: 20px; }
    }
  `}} />
);

// --- 独立模块组件 ---

function SectionHeader({ emoji, title, subtitle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #f1f5f9, #e2e8f0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "inset 0 2px 4px rgba(255,255,255,0.8)" }}>
        {emoji}
      </div>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: THEME.colors.ink, margin: 0 }}>{title}</h2>
        {subtitle && <div style={{ fontSize: 12, color: THEME.colors.muted, marginTop: 2, fontWeight: 600 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// 1. 今日行动中心
function DailyQuests({ tasks }) {
  return (
    <div className="bento-item col-span-8" style={{ animationDelay: "0.1s" }}>
      <SectionHeader emoji="🎯" title="今日特训指令" subtitle="完成三项挑战，获取完美打卡" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tasks.map((task, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 16, padding: "14px 18px",
            background: task.done ? "linear-gradient(to right, #f0fdf4, #ffffff)" : "#f8fafc",
            borderRadius: 16, border: `1px solid ${task.done ? "#86efac" : "#e2e8f0"}`,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: task.done ? "linear-gradient(135deg, #4ade80, #22c55e)" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: task.done ? "0 4px 10px rgba(34,197,94,0.3)" : "0 2px 4px rgba(0,0,0,0.05)"
            }}>
              {task.done && <span style={{ color: "#fff", fontWeight: 900 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: task.done ? "#15803d" : THEME.colors.ink, textDecoration: task.done ? "line-through" : "none" }}>{task.label}</div>
              <div style={{ fontSize: 13, color: task.done ? "#16a34a" : THEME.colors.faint, marginTop: 2, fontWeight: 500 }}>{task.done ? task.doneText : task.pendingText}</div>
            </div>
            {!task.done && <a href={task.link} style={{ padding: "6px 14px", background: THEME.colors.ink, color: "#fff", borderRadius: 999, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>去完成</a>}
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. 数据速览 & 海报入口
function QuickStatsCard({ streakDays, totalVideos, totalVocab }) {
  return (
    <div className="bento-item col-span-4" style={{ animationDelay: "0.2s", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(145deg, #ffffff, #f1f5f9)" }}>
      <SectionHeader emoji="🏆" title="核心战报" subtitle="你的努力有迹可循" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#fff7ed", padding: "16px 12px", borderRadius: 16, textAlign: "center", border: "1px solid #ffedd5" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#ea580c" }}>{streakDays}</div>
          <div style={{ fontSize: 12, color: THEME.colors.muted, fontWeight: 600 }}>连胜天数</div>
        </div>
        <div style={{ background: "#f0fdf4", padding: "16px 12px", borderRadius: 16, textAlign: "center", border: "1px solid #dcfce7" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#16a34a" }}>{totalVocab}</div>
          <div style={{ fontSize: 12, color: THEME.colors.muted, fontWeight: 600 }}>词汇宇宙</div>
        </div>
      </div>
      {/* 打卡海报呼出按钮 */}
      <button style={{
        width: "100%", padding: "14px", borderRadius: 16, border: "none",
        background: "linear-gradient(135deg, #8b5cf6, #d946ef)", color: "#fff",
        fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 20px rgba(217, 70, 239, 0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8
      }}>
        <span>📸</span> 生成今日打卡海报
      </button>
    </div>
  );
}

// 3. 街机游乐场分数墙 (全新功能)
function ArcadeRecords({ scores }) {
  const games =[
    { id: "bubble", name: "气泡拼写", emoji: "🫧", color: "#3b82f6", bg: "#eff6ff" },
    { id: "match", name: "极速连连看", emoji: "🔗", color: "#f59e0b", bg: "#fffbeb" },
    { id: "tinder", name: "单词探探", emoji: "🃏", color: "#ec4899", bg: "#fdf2f8" },
    { id: "reorder", name: "台词磁力贴", emoji: "🧩", color: "#10b981", bg: "#f0fdf4" },
    { id: "balloon", name: "盲听气球", emoji: "🎧", color: "#8b5cf6", bg: "#faf5ff" },
    { id: "speed", name: "极速二选一", emoji: "⚡", color: "#ef4444", bg: "#fef2f2" }
  ];

  return (
    <div className="bento-item col-span-12" style={{ animationDelay: "0.3s", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <SectionHeader emoji="🕹️" title={<span style={{color: "#fff"}}>街机最高纪录</span>} subtitle={<span style={{color: "#94a3b8"}}>Practice Makes Perfect</span>} />
        <a href="/practice" style={{ padding: "8px 16px", borderRadius: 999, background: "rgba(255,255,255,0.1)", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>进入大厅 →</a>
      </div>
      
      <div className="hide-scroll" style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 10 }}>
        {games.map(g => {
          const s = scores[g.id] || 0;
          return (
            <div key={g.id} style={{
              minWidth: 140, padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", alignItems: "center"
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: g.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 12 }}>{g.emoji}</div>
              <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600, marginBottom: 4 }}>{g.name}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s > 0 ? g.color : "#475569" }}>{s > 0 ? s : "未挑战"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 4. 热力图
function HeatmapWidget({ heatmapData }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days =[];
  for (let i = 111; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: heatmapData[d.toISOString().slice(0, 10)] || 0, d });
  }
  const weeks =[];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  function getColor(c) {
    if (c === 0) return "#f1f5f9";
    if (c === 1) return "#bbf7d0";
    if (c === 2) return "#4ade80";
    if (c >= 3) return "#16a34a";
  }

  return (
    <div className="bento-item col-span-6" style={{ animationDelay: "0.4s" }}>
      <SectionHeader emoji="🔥" title="365日沉浸足迹" subtitle="持之以恒，必有回响" />
      <div className="hide-scroll" style={{ overflowX: "auto", display: "flex", gap: 4, paddingBottom: 8 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {week.map((day, di) => (
              <div key={di} title={day.date} style={{
                width: 14, height: 14, borderRadius: 4, background: getColor(day.count),
                border: day.date === today.toISOString().slice(0,10) ? "2px solid #0f172a" : "none"
              }}/>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. 记忆盲盒
function MemoryWidget({ item }) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => { setFlipped(false); }, [item?.id]);

  return (
    <div className="bento-item col-span-6" style={{ animationDelay: "0.5s", display: "flex", flexDirection: "column", background: "linear-gradient(135deg, #faf5ff, #f3e8ff)", border: "1px solid #e9d5ff" }}>
      <SectionHeader emoji="💡" title="今日记忆盲盒" subtitle="从词汇库随机抽取" />
      {item ? (
        <div onClick={() => setFlipped(!flipped)} style={{
          flex: 1, background: "#fff", borderRadius: 16, padding: "24px 16px",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: "0 4px 12px rgba(147, 51, 234, 0.1)", textAlign: "center"
        }}>
          {!flipped ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>{item.term}</div>
              <div style={{ fontSize: 12, color: "#a855f7", marginTop: 8, fontWeight: 700 }}>点击翻转查看释义</div>
            </>
          ) : (
            <div style={{ animation: "fadeUp 0.3s ease" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#7e22ce" }}>{item.data?.zh || "暂无释义"}</div>
              {item.data?.example_en && <div style={{ fontSize: 13, fontStyle: "italic", color: "#475569", marginTop: 8 }}>"{item.data.example_en}"</div>}
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14 }}>暂无收藏词汇</div>
      )}
    </div>
  );
}


// --- 主页面容器 ---
export default function JournalClient() {
  const [loading, setLoading] = useState(true);
  const[me, setMe] = useState(null);
  const [journalData, setJournalData] = useState(null);
  const [gameScores, setGameScores] = useState({});
  const[memoryItem, setMemoryItem] = useState(null);

  // 1. 获取用户与日志数据
  useEffect(() => {
    async function init() {
      try {
        const meRes = await authFetch(remote("/api/me"), { cache: "no-store" });
        const meData = await meRes.json();
        setMe(meData);

        if (meData?.logged_in) {
          const[jRes, vRes] = await Promise.all([
            authFetch(remote("/api/journal_stats"), { cache: "no-store" }),
            authFetch(remote("/api/vocab_favorites"), { cache: "no-store" }),
          ]);
          const jData = await jRes.json();
          const vData = await vRes.json();
          
          setJournalData({ ...jData, vocabItems: vData?.items ||[] });
          if (vData?.items?.length > 0) {
            setMemoryItem(vData.items[Math.floor(Math.random() * vData.items.length)]);
          }

          // 读取本地游戏分数
          try {
            const localScores = JSON.parse(localStorage.getItem("naila_game_scores")) || {};
            setGameScores(localScores);
          } catch(e) {}
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    init();
  },[]);

  if (loading) return <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>加载数据中...</div>;
  if (!me?.logged_in) return <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>请先登录</div>;

  const d = journalData || {};
  const vocabItems = d.vocabItems ||[];

  // 将每日任务与你的新功能强制绑定
  const tasks =[
    { label: "观看一段原声场景", done: (d.today_views || 0) >= 1, doneText: `已看 ${d.today_views} 个`, pendingText: "输入是输出的前提", link: "/" },
    { label: "入库新的地道表达", done: (d.today_vocab || 0) >= 3, doneText: `已收藏 ${d.today_vocab} 个`, pendingText: "再去视频里淘点宝", link: "/" },
    { label: "去游乐场通关一次", done: (d.mastered_total || 0) >= 1, doneText: "语感已激活", pendingText: "挑战极速连连看或词汇探探", link: "/practice" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      <GlobalStyles />
      
      {/* 沉浸式顶部 Header */}
      <div style={{ background: "radial-gradient(120% 100% at 50% 0%, #1e293b 0%, #0f172a 100%)", padding: "60px 20px 80px", color: "#fff", textAlign: "center" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>PERSONAL DASHBOARD</div>
            <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>指挥中心，<span style={{ color: "#38bdf8" }}>{me.email.split('@')[0]}</span></h1>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", padding: "10px 20px", borderRadius: 999, backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.15)" }}>
            🗓️ {formatDate()}
          </div>
        </div>
      </div>

      {/* 核心排版区 */}
      <div className="bento-grid">
        <DailyQuests tasks={tasks} />
        <QuickStatsCard streakDays={d.streak_days || 0} totalVideos={d.total_views || 0} totalVocab={vocabItems.length} />
        
        {/* 新增的街机成绩墙 */}
        <ArcadeRecords scores={gameScores} />
        
        <HeatmapWidget heatmapData={d.heatmap || {}} />
        <MemoryWidget item={memoryItem} />
      </div>
    </div>
  );
}
