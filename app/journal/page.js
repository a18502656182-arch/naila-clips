"use client";
import { useEffect, useMemo, useState } from "react";
import { THEME } from "../components/home/theme";
import { remote, authFetch, formatDate, useIsMobile } from "./journalUtils";
import { Card, SectionTitle } from "./JournalUI";
import { OverviewPanel, TodayPlan, Heatmap, LearningAnalysis, ContinueLearning } from "./JournalPanels";
import PosterGenerator from "./PosterGenerator";

export default function Page({ accessToken }) {
  const isMobile = useIsMobile(960);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [journalData, setJournalData] = useState(null);
  const [gameSummary, setGameSummary] = useState({
    totalGameScore: 0,
    playedGameCount: 0,
  });

  useEffect(() => {
    authFetch(remote("/api/me"), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d))
      .catch(() => setMe({ logged_in: false }));
  }, []);

  useEffect(() => {
    if (!me) return;
    if (!me.logged_in) {
      setLoading(false);
      return;
    }
    loadJournalData();
  }, [me]);

  useEffect(() => {
    const token = localStorage.getItem("sb_access_token");
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_BASE || ""}/api/game_scores`, {
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setGameSummary({
          totalGameScore: data.totalGameScore || 0,
          playedGameCount: data.playedGameCount || 0,
        });
      })
      .catch(() => {});
  }, []);

  async function loadJournalData() {
    setLoading(true);
    try {
      const [journalRes, vocabRes] = await Promise.all([
        authFetch(remote("/api/journal_stats"), { cache: "no-store" }),
        authFetch(remote("/api/vocab_favorites"), { cache: "no-store" }),
      ]);
      const journal = await journalRes.json();
      const vocab = await vocabRes.json();
      const items = vocab?.items || [];
      setJournalData({ ...journal, vocabItems: items });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  if (!loading && (!me || !me.logged_in)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: THEME.colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
        }}
      >
        <Card style={{ maxWidth: 420, textAlign: "center", padding: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>📒</div>
          <div style={{ fontSize: 18, fontWeight: 1000, color: THEME.colors.ink, marginBottom: 8 }}>我的英语手帐</div>
          <div style={{ fontSize: 13, color: THEME.colors.muted, marginBottom: 18, lineHeight: 1.7 }}>
            登录后查看你的学习总览、学习日历、收藏积累和海报生成器。
          </div>
          <a
            href="/login"
            style={{
              display: "inline-block",
              padding: "12px 34px",
              background: "linear-gradient(135deg, rgba(15,23,42,1), rgba(99,102,241,0.95))",
              color: "#fff",
              borderRadius: 999,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 1000,
              boxShadow: "0 18px 40px rgba(2,6,23,0.18)",
            }}
          >
            去登录
          </a>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg }}>
        <div style={{ height: 56, background: THEME.colors.surface, borderBottom: `1px solid ${THEME.colors.border}` }} />
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "22px 16px 60px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 10,
          }}
        >
          {[220, 260, 320, 260, 220, 220].map((h, i) => (
            <div
              key={i}
              style={{
                height: h,
                borderRadius: 24,
                border: `1px solid ${THEME.colors.border}`,
                background: "linear-gradient(90deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.92) 30%, rgba(255,255,255,0.65) 60%)",
                backgroundSize: "200% 100%",
                animation: "shine 1.3s ease-in-out infinite",
              }}
            />
          ))}
        </div>
        <style>{`@keyframes shine { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      </div>
    );
  }

  const d = journalData || {};
  const vocabItems = d.vocabItems || [];
  const activeDays = Object.keys(d.heatmap || {}).length;

  const topicLabelMap = {
    "daily-life": "日常生活",
    "self-improvement": "个人成长",
    "food": "美食探店",
    "travel": "旅行",
    "business": "职场商务",
    "culture": "文化",
    "opinion": "观点表达",
    "skills": "方法技能",
  };

  const topicMap = {};
  (d.bookmarked_topics || []).forEach((slug) => {
    const label = topicLabelMap[slug] || slug;
    topicMap[label] = (topicMap[label] || 0) + 1;
  });
  const topicStats = Object.entries(topicMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const tasks = [
    { label: "今天看 1 个场景视频", done: (d.today_views || 0) >= 1 },
    { label: "今天收藏 3 个词/表达", done: (d.today_vocab || 0) >= 3 },
  ];

  const desktopHeroGrid = isMobile ? "1fr" : "1.08fr 0.92fr";
  const desktopMiddleGrid = isMobile ? "1fr" : "1.08fr 0.92fr";
  const desktopBottomGrid = isMobile ? "1fr" : "1.1fr 0.9fr";

  return (
    <div style={{ minHeight: "100vh", background: THEME.colors.bg }}>
      <style>{`
        @keyframes floatIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.82))",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(15,23,42,0.08)",
          padding: "0 16px",
          height: 56,
          display: "flex",
          alignItems: "center",
          flexDirection: "column", alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a
            href="/"
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(15,23,42,0.10)",
              background: "rgba(15,23,42,0.04)",
              textDecoration: "none",
              fontSize: 13,
              color: THEME.colors.ink,
              fontWeight: 900,
            }}
          >
            ← 返回
          </a>
          <span style={{ fontSize: 15, fontWeight: 1000, color: THEME.colors.ink }}>我的英语手帐</span>
        </div>
        {!isMobile ? (
          <span style={{ fontSize: 11, color: THEME.colors.faint, fontWeight: 800 }}>📅 {formatDate()}</span>
        ) : null}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "18px 16px 60px" }}>
        <div
          style={{
            borderRadius: 28,
            padding: isMobile ? "18px 16px" : "22px 22px",
            color: "#fff",
            background:
              "radial-gradient(circle at 10% 10%, rgba(236,72,153,0.55), transparent 45%), radial-gradient(circle at 90% 20%, rgba(99,102,241,0.65), transparent 40%), radial-gradient(circle at 40% 120%, rgba(14,165,233,0.55), transparent 50%), linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(79,70,229,0.95) 40%, rgba(236,72,153,0.85) 100%)",
            boxShadow: "0 24px 70px rgba(2,6,23,0.18)",
            position: "relative",
            overflow: "hidden",
            animation: "floatIn 420ms ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: isMobile ? "flex-start" : "center",
              flexDirection: "column", alignItems: "center",
              flexDirection: isMobile ? "column" : "row",
              gap: 10,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 1000 }}>
                👋 {me?.email?.split("@")[0] || "同学"}，今天也来留下一点学习痕迹
              </div>
              <div style={{ fontSize: 13, opacity: 0.92, lineHeight: 1.8, marginTop: 8 }}>
                现在这版手帐页只保留真实有效的学习数据：看视频、收藏词汇、活跃天数、学习偏好和游戏大厅入口，不再沿用旧考试系统的掌握判定。
              </div>
            </div>
            <div
              style={{
                minWidth: isMobile ? "100%" : 180,
                padding: "14px 14px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.86, fontWeight: 900 }}>当前状态</div>
              <div style={{ fontSize: 28, fontWeight: 1000, marginTop: 4 }}>{d.streak_days || 0} 天</div>
              <div style={{ fontSize: 12, opacity: 0.88, marginTop: 4 }}>连续学习中</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: desktopHeroGrid, gap: 10, marginTop: 14, alignItems: "start" }}>
          <OverviewPanel
            streakDays={d.streak_days || 0}
            totalViews={d.total_views || 0}
            activeDays={activeDays}
            vocabCount={vocabItems.length}
            isMobile={isMobile}
          />
          <TodayPlan d={d} isMobile={isMobile} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: desktopMiddleGrid, gap: 10, marginTop: 14, alignItems: "start" }}>
          <Heatmap
            heatmapData={d.heatmap || {}}
            streakDays={d.streak_days || 0}
            totalViews={d.total_views || 0}
            isMobile={isMobile}
          />
          <LearningAnalysis
            d={d}
            vocabCount={vocabItems.length}
            topicStats={topicStats}
            gameSummary={gameSummary}
            isMobile={isMobile}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: desktopBottomGrid, gap: 10, marginTop: 14 }}>
          <ContinueLearning isMobile={isMobile} />
          <Card style={{ padding: 18 }}>
            <SectionTitle
              emoji="📸"
              title="海报生成器"
              sub="作为模块6保留，并且固定成这个页面的成果展示出口"
            />
            <PosterGenerator
              me={me}
              streakDays={d.streak_days || 0}
              totalVideos={d.total_views || 0}
              vocabCount={vocabItems.length}
              masteredCount={0}
              heatmapData={d.heatmap || {}}
              tasks={tasks}
              activeDays={activeDays}
              topTopic={topicStats[0]?.label || "继续学习后会出现"}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
