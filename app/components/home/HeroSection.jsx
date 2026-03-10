// app/components/home/HeroSection.jsx
"use client";
import { THEME } from "./theme";
import FeaturedExamples from "./FeaturedExamples";

function MiniTag({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 999,
        background: "rgba(255, 255, 255, 0.6)",
        border: `1px solid rgba(255, 255, 255, 0.8)`,
        color: THEME.colors.ink,
        fontSize: 13,
        fontWeight: 800,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04), inset 0 0 0 1px rgba(255, 255, 255, 0.4)",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        cursor: "default",
      }}
      className="heroMiniTag"
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2})`,
          boxShadow: "0 0 10px rgba(79, 70, 229, 0.4)",
          flex: "0 0 auto",
        }}
      />
      {children}
    </span>
  );
}

export default function HeroSection({ featured }) {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 32,
        border: `1px solid rgba(255,255,255,0.6)`,
        background: "#f8fafc",
        boxShadow: "0 30px 80px rgba(15,23,42,0.06), inset 0 0 0 1px rgba(255,255,255,0.8)",
      }}
    >
      <style>{`
        /* 动感流光背景动画 */
        @keyframes floatBlob {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
        
        .heroOrb {
          position: absolute;
          filter: blur(80px);
          opacity: 0.5;
          border-radius: 50%;
          animation: floatBlob 12s infinite ease-in-out;
          pointer-events: none;
        }
        .orb-1 { top: -10%; left: -10%; width: 500px; height: 500px; background: rgba(99,102,241,0.4); animation-delay: 0s; }
        .orb-2 { bottom: -20%; right: -10%; width: 600px; height: 600px; background: rgba(6,182,212,0.3); animation-delay: -3s; }
        .orb-3 { top: 30%; left: 40%; width: 450px; height: 450px; background: rgba(236,72,153,0.25); animation-delay: -6s; }

        .heroMiniTag:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.6);
        }

        .heroWrap {
          position: relative;
          z-index: 10;
          padding: 40px 32px;
          background: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="2" cy="2" r="1" fill="rgba(15,23,42,0.03)"/></svg>') repeat;
        }
        
        .heroGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 480px;
          gap: 40px;
          align-items: center;
        }

        .heroLeft {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .heroEyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          width: fit-content;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.8);
          color: ${THEME.colors.accent};
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 12px rgba(79,70,229,0.08);
        }

        .heroTitle {
          margin: 24px 0 0;
          font-size: 60px;
          line-height: 1.05;
          letter-spacing: -0.04em;
          font-weight: 900;
          color: #0f172a;
          background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .heroDesc {
          margin-top: 20px;
          max-width: 520px;
          color: #475569;
          font-size: 17px;
          line-height: 1.8;
          font-weight: 500;
        }

        .heroTags {
          margin-top: 28px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .heroActions {
          margin-top: 36px;
          display: flex;
          gap: 14px;
          flex-wrap: nowrap;
          align-items: center;
        }

        /* 动感主按钮 */
        .heroBtnPrimary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 54px;
          padding: 0 28px;
          border-radius: 999px;
          text-decoration: none;
          background: linear-gradient(135deg, #0f172a 0%, #312e81 100%);
          color: #fff;
          font-size: 15px;
          font-weight: 900;
          box-shadow: 0 12px 30px rgba(49, 46, 129, 0.25);
          white-space: nowrap;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .heroBtnPrimary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 20px 40px rgba(49, 46, 129, 0.35);
        }

        /* 玻璃质感次按钮 */
        .heroBtnJournal, .heroBtnGame {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 54px;
          padding: 0 24px;
          border-radius: 999px;
          text-decoration: none;
          background: rgba(255, 255, 255, 0.7);
          color: ${THEME.colors.ink};
          font-size: 15px;
          font-weight: 800;
          white-space: nowrap;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }
        
        .heroBtnJournal { border: 1.5px solid rgba(79,70,229,0.2); }
        .heroBtnJournal:hover {
          background: #fff;
          border-color: rgba(79,70,229,0.4);
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(79,70,229,0.12);
          color: #4f46e5;
        }

        .heroBtnGame { border: 1.5px solid rgba(124,58,237,0.2); }
        .heroBtnGame:hover {
          background: #fff;
          border-color: rgba(124,58,237,0.4);
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(124,58,237,0.12);
          color: #7c3aed;
        }

        .heroNote {
          margin-top: 20px;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .heroNote::before {
          content: '';
          display: block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .heroRight {
          display: flex;
          align-items: center;
          justify-content: stretch;
          min-width: 0;
          position: relative;
        }
        .heroRight::after {
          content: '';
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
          z-index: -1;
          pointer-events: none;
        }

        @media (max-width: 1180px) {
          .heroGrid { grid-template-columns: minmax(0, 1fr) 420px; gap: 30px; }
          .heroTitle { font-size: 48px; }
        }

        @media (max-width: 960px) {
          .heroWrap { padding: 32px 20px; }
          .heroGrid { grid-template-columns: 1fr; gap: 30px; }
          .heroTitle { font-size: 40px; margin-top: 20px; }
          .heroActions { flex-wrap: wrap; }
          .heroRight::after { display: none; }
        }

        @media (max-width: 640px) {
          .heroWrap { padding: 24px 16px; }
          .heroTitle { font-size: 34px; }
          .heroDesc { font-size: 15px; }
          .heroBtnPrimary, .heroBtnJournal, .heroBtnGame { height: 48px; font-size: 14px; padding: 0 20px;}
        }
      `}</style>

      {/* 动感模糊光晕 */}
      <div className="heroOrb orb-1" />
      <div className="heroOrb orb-2" />
      <div className="heroOrb orb-3" />

      <div className="heroWrap">
        <div className="heroGrid">
          <div className="heroLeft">
            <div className="heroEyebrow">
              ✦ IMMERSIVE SCENE LIBRARY
            </div>

            <h1 className="heroTitle">
              沉浸式真实语境，
              <br />
              重塑你的英语本能
            </h1>

            <div className="heroDesc">
              摒弃死记硬背。从全网精选的超清实境短片中提取高频语料，配合交互式双语字幕与动态卡片，让每一次观看都转化为真正的肌肉记忆。
            </div>

            <div className="heroTags">
              <MiniTag>实境短片流</MiniTag>
              <MiniTag>动态双语字幕</MiniTag>
              <MiniTag>高频语料库</MiniTag>
            </div>

            <div className="heroActions">
              <a href="#all" className="heroBtnPrimary">
                立即探索内容库
              </a>
              <a href="/journal" className="heroBtnJournal">
                📒 专属数据手帐
              </a>
              <a href="/practice" className="heroBtnGame">
                🎮 语境闯关
              </a>
            </div>

            <div className="heroNote">系统化积累口语表达，拒绝碎片化焦虑。</div>
          </div>

          <div className="heroRight">
            <FeaturedExamples featured={featured} />
          </div>
        </div>
      </div>
    </section>
  );
}
