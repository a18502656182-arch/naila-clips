// app/components/home/HeroSection.jsx
import { THEME } from "./theme";

function Stat({ value, label }) {
  return (
    <div
      style={{
        minWidth: 112,
        padding: "14px 16px",
        borderRadius: 18,
        background: "rgba(255,255,255,0.72)",
        border: `1px solid ${THEME.colors.border}`,
        boxShadow: THEME.colors.shadowSoft,
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          fontSize: 22,
          lineHeight: 1,
          fontWeight: 950,
          color: THEME.colors.ink,
          letterSpacing: "-0.04em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          color: THEME.colors.faint,
          lineHeight: 1.4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FeaturePill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.82)",
        border: `1px solid ${THEME.colors.border}`,
        color: THEME.colors.ink,
        fontSize: 13,
        fontWeight: 700,
        boxShadow: "0 8px 22px rgba(15,23,42,0.06)",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2})`,
          boxShadow: "0 0 0 4px rgba(79,70,229,0.10)",
          flex: "0 0 auto",
        }}
      />
      {children}
    </span>
  );
}

export default function HeroSection({ children }) {
  return (
    <section
      style={{
        position: "relative",
        borderRadius: THEME.radii.xl,
        border: `1px solid ${THEME.colors.border}`,
        background:
          "radial-gradient(1100px 420px at 8% 0%, rgba(79,70,229,0.18), transparent 52%), radial-gradient(860px 360px at 100% 12%, rgba(6,182,212,0.18), transparent 48%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.84))",
        boxShadow: "0 24px 70px rgba(15,23,42,0.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(79,70,229,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,0.045) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.35,
          pointerEvents: "none",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.8), rgba(0,0,0,0.2))",
        }}
      />

      <style>{`
        .heroShell {
          position: relative;
          padding: 28px;
        }
        .heroGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
          gap: 20px;
          align-items: stretch;
        }
        .heroTitle {
          font-size: 52px;
          line-height: 1.02;
          letter-spacing: -0.05em;
          font-weight: 980;
          color: ${THEME.colors.ink};
          margin: 0;
        }
        .heroSub {
          margin-top: 16px;
          max-width: 620px;
          color: ${THEME.colors.muted};
          font-size: 15px;
          line-height: 1.82;
        }
        .heroStats {
          margin-top: 22px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .heroPills {
          margin-top: 18px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .heroCtas {
          margin-top: 22px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .heroLeftCard {
          position: relative;
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.72));
          border: 1px solid ${THEME.colors.border};
          padding: 28px;
          min-height: 430px;
          backdrop-filter: blur(12px);
          box-shadow: 0 18px 44px rgba(15,23,42,0.06);
        }
        .heroRightWrap {
          display: flex;
          align-items: stretch;
        }
        .heroBottom {
          margin-top: 22px;
        }
        .heroEyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.82);
          border: 1px solid ${THEME.colors.border};
          color: ${THEME.colors.ink};
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          box-shadow: 0 10px 24px rgba(15,23,42,0.05);
        }
        .heroEyebrowDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2});
          box-shadow: 0 0 0 5px rgba(79,70,229,0.10);
          flex: 0 0 auto;
        }
        .heroPrimaryBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-decoration: none;
          padding: 13px 18px;
          min-height: 48px;
          border-radius: 999px;
          background: linear-gradient(135deg, ${THEME.colors.ink}, #1e293b);
          color: #fff;
          font-size: 14px;
          font-weight: 900;
          box-shadow: 0 16px 34px rgba(15,23,42,0.18);
        }
        .heroSecondaryText {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: ${THEME.colors.faint};
          font-size: 13px;
          font-weight: 600;
        }
        .heroSecondaryTextDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: ${THEME.colors.good};
          box-shadow: 0 0 0 5px rgba(16,185,129,0.12);
          flex: 0 0 auto;
        }
        @media (max-width: 1100px) {
          .heroTitle {
            font-size: 44px;
          }
        }
        @media (max-width: 960px) {
          .heroShell {
            padding: 18px;
          }
          .heroGrid {
            grid-template-columns: 1fr;
          }
          .heroLeftCard {
            min-height: auto;
            padding: 22px;
          }
          .heroTitle {
            font-size: 38px;
          }
        }
        @media (max-width: 640px) {
          .heroTitle {
            font-size: 32px;
          }
          .heroSub {
            font-size: 14px;
            line-height: 1.75;
          }
          .heroLeftCard {
            padding: 18px;
            border-radius: 18px;
          }
          .heroShell {
            padding: 14px;
          }
        }
      `}</style>

      <div className="heroShell">
        <div className="heroGrid">
          <div className="heroLeftCard">
            <div className="heroEyebrow">
              <span className="heroEyebrowDot" />
              English Through Real Scenes
            </div>

            <h1 className="heroTitle" style={{ marginTop: 18 }}>
              用真实场景输入，
              <br />
              练出能开口的英语表达
            </h1>

            <div className="heroSub">
              精选高质量英语短片，把“看视频”升级成一套可持续复用的学习流程。
              你可以一边看双语字幕，一边抓住高频表达，再把词汇卡和复习练习串起来，让输入真正沉淀成自己的口语能力。
            </div>

            <div className="heroPills">
              <FeaturePill>场景短片精学</FeaturePill>
              <FeaturePill>双语字幕跟读</FeaturePill>
              <FeaturePill>词汇卡沉浸吸收</FeaturePill>
            </div>

            <div className="heroStats">
              <Stat value="1 条" label="每天只学一条，也能稳定积累" />
              <Stat value="字幕 + 词卡" label="把内容理解和表达复用连起来" />
              <Stat value="更敢开口" label="从听懂到会说的过渡更自然" />
            </div>

            <div className="heroCtas">
              <a href="#all" className="heroPrimaryBtn">
                开始浏览内容库
              </a>

              <span className="heroSecondaryText">
                <span className="heroSecondaryTextDot" />
                持续更新高质量示例视频
              </span>
            </div>

            <div className="heroBottom">{children?.[0] || null}</div>
          </div>

          <div className="heroRightWrap">{children?.[1] || null}</div>
        </div>
      </div>
    </section>
  );
}
