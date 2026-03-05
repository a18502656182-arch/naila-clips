"use client";
import { useState, useEffect, useRef } from "react";
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

// ── 全局样式注入 (动画与交互) ──────────────────────────────
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 15px rgba(34, 197, 94, 0.2); }
      50% { box-shadow: 0 0 25px rgba(34, 197, 94, 0.6); }
    }
    @keyframes shimmer {
      100% { transform: translateX(100%); }
    }
    .modern-card {
      background: #ffffff;
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 12px 32px -8px rgba(11, 18, 32, 0.05), 0 4px 12px -4px rgba(11, 18, 32, 0.03);
      border: 1px solid rgba(11, 18, 32, 0.03);
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s;
    }
    .modern-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 40px -8px rgba(11, 18, 32, 0.08), 0 8px 16px -4px rgba(11, 18, 32, 0.04);
    }
    .task-item:hover { transform: scale(1.01); }
    .heatmap-scroll::-webkit-scrollbar { display: none; }
    .heatmap-scroll { -ms-overflow-style: none; scrollbar-width: none; }
    .badge-float { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `}} />
);

function Card({ children, style = {}, className = "" }) {
  return <div className={`modern-card ${className}`} style={style}>{children}</div>;
}

function SectionTitle({ emoji, title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ 
          width: 36, height: 36, borderRadius: "12px", 
          background: "linear-gradient(135deg, #f8fafc, #f1f5f9)", 
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02)"
        }}>
          {emoji}
        </div>
        <span style={{ fontSize: 18, fontWeight: 900, color: THEME.colors.ink, letterSpacing: "-0.5px" }}>{title}</span>
      </div>
      {sub && <div style={{ fontSize: 13, color: THEME.colors.faint, marginTop: 4, marginLeft: 46, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

// ── 今日任务 ──────────────────────────────────────────────
function TodayTasks({ tasks }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const allDone = tasks.every(t => t.done);
  const doneCount = tasks.filter(t => t.done).length;

  useEffect(() => {
    if (allDone) setShowConfetti(true);
  }, [allDone]);

  return (
    <Card className="badge-float" style={{ animationDelay: "0.1s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <SectionTitle emoji="🎯" title="今日行动清单" sub="完成每日习惯，口语肌肉记忆自然形成" />
        <div style={{ 
          background: allDone ? "linear-gradient(135deg, #22c55e, #16a34a)" : "#f1f5f9",
          color: allDone ? "#fff" : THEME.colors.muted,
          padding: "6px 14px", borderRadius: "999px", fontSize: 13, fontWeight: 800,
          boxShadow: allDone ? "0 4px 12px rgba(34,197,94,0.3)" : "none",
          transition: "all 0.3s"
        }}>
          {doneCount} / {tasks.length}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {tasks.map((task, i) => (
          <div key={i} className="task-item" style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "16px 20px",
            borderRadius: "16px",
            background: task.done ? "linear-gradient(to right, #f0fdf4, #ffffff)" : "#f8fafc",
            border: `1px solid ${task.done ? "rgba(34,197,94,0.3)" : "rgba(11,18,32,0.04)"}`,
            transition: "all 0.3s ease",
            position: "relative", overflow: "hidden"
          }}>
            {/* 勾选框 */}
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: task.done ? "linear-gradient(135deg, #4ade80, #22c55e)" : "#ffffff",
              border: `2px solid ${task.done ? "#22c55e" : "#cbd5e1"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
              boxShadow: task.done ? "0 4px 10px rgba(34,197,94,0.4)" : "inset 0 2px 4px rgba(0,0,0,0.02)",
              transform: task.done ? "scale(1.05)" : "scale(1)"
            }}>
              {task.done && <span style={{ color: "#fff", fontSize: 14, fontWeight: 900, textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>✓</span>}
            </div>
            
            {/* 文本区 */}
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: 15, fontWeight: 800, 
                color: task.done ? "#15803d" : THEME.colors.ink,
                textDecoration: task.done ? "line-through" : "none",
                textDecorationColor: "rgba(21,128,61,0.4)"
              }}>
                {task.label}
              </div>
              <div style={{ fontSize: 13, color: task.done ? "#16a34a" : THEME.colors.faint, marginTop: 4, fontWeight: 500 }}>
                {task.done ? task.doneText : task.pendingText}
              </div>
            </div>
            {task.done && <span style={{ fontSize: 20, filter: "drop-shadow(0 2px 4px rgba(250,204,21,0.4))" }}>⭐</span>}
          </div>
        ))}
      </div>

      {/* 达成特效横幅 */}
      {allDone && showConfetti && (
        <div style={{
          marginTop: 20, padding: "18px 20px", borderRadius: "16px",
          background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fef9c3 100%)",
          border: "1px solid rgba(245,158,11,0.2)",
          display: "flex", alignItems: "center", gap: 16,
          animation: "slideUpFade 0.6s ease forwards",
          boxShadow: "0 8px 20px rgba(251,191,36,0.15)"
        }}>
          <div style={{ fontSize: 36, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>🏆</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#92400e", letterSpacing: "-0.5px" }}>
              今日目标完美达成！
            </div>
            <div style={{ fontSize: 13, color: "#b45309", marginTop: 4, fontWeight: 500 }}>
              你的每一次跟读，都在重塑大脑的语言回路。明天见！
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── 热力图 ────────────────────────────────────────────────
function Heatmap({ heatmapData, streakDays, totalVideos }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days =[];
  for (let i = 111; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: heatmapData[key] || 0, d });
  }

  const pad = (days[0].d.getDay() + 6) % 7;
  const padded = [...Array(pad).fill(null), ...days];
  const weeks =[];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const monthLabels =[];
  weeks.forEach((week, wi) => {
    const first = week.find(d => d);
    if (first && new Date(first.date).getDate() <= 7) {
      monthLabels.push({ wi, label: `${new Date(first.date).getMonth() + 1}月` });
    }
  });

  // 更高级的绿调配色 (仿 GitHub 新版)
  function getColor(count) {
    if (count === 0) return "#f1f5f9";
    if (count === 1) return "#bbf7d0";
    if (count === 2) return "#4ade80";
    if (count === 3) return "#22c55e";
    return "#15803d";
  }

  const todayKey = today.toISOString().slice(0, 10);
  const activeDays = Object.keys(heatmapData).length;

  return (
    <Card className="badge-float" style={{ animationDelay: "0.2s" }}>
      <SectionTitle emoji="🔥" title="学习足迹" sub="每一格绿色，都是你脱口而出的底气" />

      {/* 高级数据概览 (Bento 风格) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { num: streakDays, label: "连续打卡", icon: "🔥", gradient: "linear-gradient(135deg, #ffedd5, #ffedd5)", color: "#ea580c" },
          { num: totalVideos, label: "沉浸视频", icon: "🎬", gradient: "linear-gradient(135deg, #e0e7ff, #e0e7ff)", color: "#4f46e5" },
          { num: activeDays, label: "累计活跃", icon: "📅", gradient: "linear-gradient(135deg, #dcfce7, #dcfce7)", color: "#16a34a" },
        ].map((s, i) => (
          <div key={i} style={{
            padding: "16px 12px", borderRadius: "16px", background: s.gradient,
            border: `1px solid rgba(255,255,255,0.5)`, position: "relative", overflow: "hidden",
            boxShadow: "inset 0 2px 4px rgba(255,255,255,0.5), 0 4px 12px rgba(0,0,0,0.02)"
          }}>
            <div style={{ position: "absolute", top: -10, right: -10, fontSize: 40, opacity: 0.1, filter: "grayscale(100%)" }}>{s.icon}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span>
              <span style={{ fontSize: 12, color: THEME.colors.faint, fontWeight: 700 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: s.color, letterSpacing: "-1px", lineHeight: 1 }}>{s.num}</div>
          </div>
        ))}
      </div>

      {/* 热力图区域 */}
      <div style={{ 
        background: "#fafafa", borderRadius: "16px", padding: "16px", 
        border: "1px solid rgba(11,18,32,0.04)", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.02)"
      }}>
        <div className="heatmap-scroll" style={{ overflowX: "auto", paddingBottom: 8 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {weeks.map((week, wi) => {
              const ml = monthLabels.find(m => m.wi === wi);
              return (
                <div key={wi} style={{ width: 14, fontSize: 10, fontWeight: 600, color: "#94a3b8", textAlign: "center", flexShrink: 0 }}>
                  {ml ? ml.label : ""}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {week.map((day, di) => {
                  const isToday = day?.date === todayKey;
                  return (
                    <div
                      key={di}
                      title={day ? `${day.date}：${day.count > 0 ? `学习了 ${day.count} 节内容` : "未学习"}` : ""}
                      style={{
                        width: 14, height: 14,
                        borderRadius: "4px",
                        background: day ? getColor(day.count) : "transparent",
                        flexShrink: 0,
                        boxShadow: day?.count > 0 ? "inset 0 1px 2px rgba(255,255,255,0.4)" : "none",
                        border: isToday ? `2px solid #0f172a` : "none",
                        position: "relative", cursor: "pointer",
                        transition: "transform 0.1s"
                      }}
                      onMouseOver={e => day && (e.currentTarget.style.transform = "scale(1.2)")}
                      onMouseOut={e => day && (e.currentTarget.style.transform = "scale(1)")}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 图例 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, justifyContent: "flex-end" }}>
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>休息</span>
          {["#f1f5f9", "#bbf7d0", "#4ade80", "#22c55e", "#15803d"].map((c, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "3px", background: c, boxShadow: "inset 0 1px 1px rgba(0,0,0,0.05)" }} />
          ))}
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>超神</span>
        </div>
      </div>
    </Card>
  );
}

// ── 能力画像 ──────────────────────────────────────────────
function AbilityProfile({ masteryStats, topicStats }) {
  const total = masteryStats.new + masteryStats.learning + masteryStats.mastered;
  const pct = (n) => total > 0 ? Math.round(n / total * 100) : 0;

  const levelMessages =[
    { min: 0, max: 0, msg: "英语宇宙待唤醒", sub: "去收藏你的第一个高频表达吧", emoji: "🌱" },
    { min: 1, max: 10, msg: "星火初燃", sub: "万事开头难，你已经迈出了第一步", emoji: "🌿" },
    { min: 11, max: 50, msg: "渐入佳境", sub: "词汇量稳步提升，语感正在形成", emoji: "⛵" },
    { min: 51, max: 199, msg: "口语达人", sub: "这些地道表达足够应付日常对话了！", emoji: "🚀" },
    { min: 200, max: Infinity, msg: "母语者级别", sub: "你的词汇库已经星光璀璨！", emoji: "👑" },
  ];
  const lvl = levelMessages.find(l => total >= l.min && total <= l.max) || levelMessages[0];

  return (
    <Card className="badge-float" style={{ animationDelay: "0.3s" }}>
      <SectionTitle emoji="📊" title="能力画像" sub="科学追踪，让每一次复习都有迹可循" />

      {/* 动态头衔区域 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, marginBottom: 24,
        padding: "20px", borderRadius: "20px",
        background: "linear-gradient(to right, #ffffff, #f8fafc)",
        border: "1px solid rgba(11,18,32,0.05)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
      }}>
        <div style={{ 
          fontSize: 42, width: 72, height: 72, background: "#f1f5f9", 
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "inset 0 4px 8px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05)"
        }}>
          {lvl.emoji}
        </div>
        <div>
          <div style={{ fontSize: 13, color: THEME.colors.faint, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>当前称号</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: THEME.colors.ink, margin: "2px 0 4px", letterSpacing: "-0.5px" }}>{lvl.msg}</div>
          <div style={{ fontSize: 13, color: THEME.colors.muted }}>{lvl.sub}</div>
        </div>
      </div>

      {total > 0 && (
        <>
          {/* 进度条与数据看板 */}
          <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "20px", border: "1px solid rgba(11,18,32,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.colors.ink }}>知识库总览</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: THEME.colors.accent }}>{total} <span style={{fontSize:12, fontWeight:600, color:THEME.colors.muted}}>词</span></span>
            </div>

            {/* 厚版平滑进度条 */}
            <div style={{
              height: 18, borderRadius: 999, overflow: "hidden",
              display: "flex", background: "#e2e8f0", marginBottom: 20,
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <div style={{ width: `${pct(masteryStats.mastered)}%`, background: "linear-gradient(90deg, #10b981, #059669)", transition: "width 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
              <div style={{ width: `${pct(masteryStats.learning)}%`, background: "linear-gradient(90deg, #3b82f6, #2563eb)", transition: "width 1s cubic-bezier(0.34, 1.56, 0.64, 1)", borderLeft: masteryStats.learning > 0 ? "2px solid #fff" : "none" }} />
              <div style={{ width: `${pct(masteryStats.new)}%`, background: "linear-gradient(90deg, #a855f7, #9333ea)", transition: "width 1s cubic-bezier(0.34, 1.56, 0.64, 1)", borderLeft: masteryStats.new > 0 ? "2px solid #fff" : "none" }} />
            </div>

            {/* 三项核心指标 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "已掌握", count: masteryStats.mastered, dot: "#10b981" },
                { label: "学习中", count: masteryStats.learning, dot: "#3b82f6" },
                { label: "待激活", count: masteryStats.new, dot: "#a855f7" },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.dot, boxShadow: `0 0 8px ${b.dot}` }} />
                    <span style={{ fontSize: 12, color: THEME.colors.faint, fontWeight: 600 }}>{b.label}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: THEME.colors.ink, letterSpacing: "-0.5px" }}>
                    {b.count} <span style={{ fontSize: 12, fontWeight: 500, color: THEME.colors.muted }}>({pct(b.count)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 话题雷达/偏好标签 */}
          {topicStats.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.colors.ink, marginBottom: 12, display:"flex", alignItems:"center", gap:6 }}>
                <span>🎯</span> 你的内容偏好
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {topicStats.map((t, i) => {
                  const isTop = i === 0;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: isTop ? "6px 14px" : "6px 12px",
                      borderRadius: "100px",
                      background: isTop ? "linear-gradient(135deg, #1e293b, #0f172a)" : "#f1f5f9",
                      color: isTop ? "#fff" : THEME.colors.muted,
                      border: isTop ? "none" : "1px solid #e2e8f0",
                      fontWeight: isTop ? 700 : 600, fontSize: isTop ? 14 : 13,
                      boxShadow: isTop ? "0 4px 10px rgba(15,23,42,0.2)" : "none"
                    }}>
                      <span>{t.label}</span>
                      <span style={{ 
                        background: isTop ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.05)", 
                        padding: "2px 6px", borderRadius: "100px", fontSize: 11 
                      }}>
                        {t.count} 篇
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ── 记忆碎片 (保持原逻辑，仅适配容器) ─────────────────────
function MemoryCard({ item, onRefresh, totalVocab }) {
  // ... (保留你原来发给我的 MemoryCard 的全部内部逻辑，无需改动)
  return <div style={{display: 'none'}}>由于字数限制，这部分不包含在内，保留你原本的代码即可</div>
}

// ── 主页面 ────────────────────────────────────────────────
export default function JournalClient({ accessToken }) {
  const[loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [journalData, setJournalData] = useState(null);
  const[memoryItem, setMemoryItem] = useState(null);

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
      const[journalRes, vocabRes] = await Promise.all([
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

  // Loading 与 未登录界面略... (直接使用你原来的即可)
  if (loading || (!me || !me.logged_in)) return <div>Loading...</div>; // 请保留原来的Loading代码

  const d = journalData || {};
  const vocabItems = d.vocabItems || [];

  const tasks =[
    {
      label: "沉浸 1 个场景视频",
      done: (d.today_views || 0) >= 1,
      doneText: `已看 ${d.today_views || 0} 个视频，语感+1`,
      pendingText: "打开任意视频，保持英语思维",
    },
    {
      label: "捕获 3 个地道表达",
      done: (d.today_vocab || 0) >= 3,
      doneText: `已入库 ${d.today_vocab || 0} 个词汇，弹药充足`,
      pendingText: `还差 ${Math.max(0, 3 - (d.today_vocab || 0))} 个即可达成`,
    },
    {
      label: "完成 1 次词汇通关",
      done: (d.mastered_total || 0) >= 1,  // 注意：这里需按照你的实际逻辑，这里仅做UI展示
      doneText: `知识已巩固，底气更足`,
      pendingText: "去收藏页完成一次随考",
    },
  ];

  const masteryStats = {
    new: vocabItems.filter(v => (v.mastery_level ?? 0) === 0).length,
    learning: vocabItems.filter(v => (v.mastery_level ?? 0) === 1).length,
    mastered: vocabItems.filter(v => (v.mastery_level ?? 0) === 2).length,
  };

  const topicMap = {};
  const topicLabelMap = {
    "daily-life": "日常生活", "self-improvement": "个人成长",
    "food": "美食探店", "travel": "旅行", "business": "职场商务",
    "culture": "文化", "opinion": "观点表达", "skills": "方法技能",
  };
  (d.bookmarked_topics ||[]).forEach(slug => {
    const label = topicLabelMap[slug] || slug;
    topicMap[label] = (topicMap[label] || 0) + 1;
  });
  const topicStats = Object.entries(topicMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <GlobalStyles />

      {/* 沉浸式高级横幅 */}
      <div style={{
        position: "relative",
        background: "radial-gradient(120% 120% at 50% 0%, #1e293b 0%, #0f172a 100%)",
        padding: "60px 16px 80px",
        overflow: "hidden"
      }}>
        {/* 背景光晕装饰 */}
        <div style={{ position: "absolute", top: -50, left: "10%", width: 300, height: 300, background: "#4f46e5", filter: "blur(100px)", opacity: 0.3, borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -50, right: "10%", width: 250, height: 250, background: "#0ea5e9", filter: "blur(80px)", opacity: 0.2, borderRadius: "50%" }} />

        <div style={{ maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #e2e8f0, #cbd5e1)", border: "2px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
              🤓
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff", letterSpacing: "-1px" }}>
                {me?.email?.split("@")[0] || "同学"} 的英语指挥部
              </div>
              <div style={{ fontSize: 14, color: "#94a3b8", fontWeight: 500, marginTop: 4 }}>
                {formatDate()} · 愿你每天都有新的收获
              </div>
            </div>
          </div>

          {/* 玻璃拟物态总进度条 */}
          <div style={{ 
            background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "20px", marginTop: 24
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              <span>今日能量槽</span>
              <span>{Math.round(doneCount / 3 * 100)}%</span>
            </div>
            <div style={{ height: 8, background: "rgba(0,0,0,0.3)", borderRadius: 999, overflow: "hidden", position: "relative" }}>
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${Math.round(doneCount / 3 * 100)}%`,
                background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
                borderRadius: 999, transition: "width 1s cubic-bezier(0.34, 1.56, 0.64, 1)"
              }}>
                {/* 进度条扫光动画 */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                  animation: "shimmer 2s infinite"
                }}/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主体内收，形成层叠感 */}
      <div style={{ 
        maxWidth: 800, margin: "-50px auto 60px", padding: "0 16px", 
        display: "flex", flexDirection: "column", gap: 24, position: "relative", zIndex: 20 
      }}>
        <TodayTasks tasks={tasks} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 24 }}>
          <Heatmap heatmapData={d.heatmap || {}} streakDays={d.streak_days || 0} totalVideos={d.total_views || 0} />
          <AbilityProfile masteryStats={masteryStats} topicStats={topicStats} />
        </div>
      </div>
    </div>
  );
}
