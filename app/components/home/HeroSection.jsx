// app/components/home/HeroSection.jsx
import { THEME } from "./theme";

function MiniTag({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 14px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.72)",
        border: `1px solid ${THEME.colors.border}`,
        color: THEME.colors.ink,
        fontSize: 13,
        fontWeight: 700,
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
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
  const featured = children?.[1] || null;

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 30,
        border: `1px solid ${THEME.colors.border}`,
        background:
          "radial-gradient(900px 360px at 0% 0%, rgba(79,70,229,0.14), transparent 50%), radial-gradient(700px 320px at 100% 0%, rgba(6,182,212,0.14), transparent 45%), linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.82))",
        boxShadow: "0 24px 70px rgba(15,23,42,0.08)",
      }}
    >
      <style>{`
        .heroWrap {
          position: relative;
          padding: 24px;
        }
        .heroGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 460px;
          gap: 20px;
          align-items: center;
        }
        .heroLeft {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 360px;
          padding: 6px 4px;
        }
        .heroEyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.78);
          border: 1px solid ${THEME.colors.border};
          color: ${THEME.colors.ink};
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .04em;
          text-transform: uppercase;
          box-shadow: 0 8px 20px rgba(15,23,42,0.05);
        }
        .heroEyebrowDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2});
          box-shadow: 0 0 0 5px rgba(79,70,229,0.10);
          flex: 0 0 auto;
        }
        .heroTitle {
          margin: 18px 0 0;
          font-size: 56px;
          line-height: 1.02;
          letter-spacing: -0.055em;
          font-weight: 980;
          color: ${THEME.colors.ink};
          max-width: 620px;
        }
        .heroDesc {
          margin-top: 18px;
          max-width: 540px;
          color: ${THEME.colors.muted};
          font-size: 16px;
          line-height: 1.8;
        }
        .heroTags {
          margin-top: 18px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .heroActions {
          margin-top: 24px;
          display: flex;
          gap: 10px;
          flex-wrap: nowrap;
          align-items: center;
        }
        .heroBtnPrimary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 50px;
          padding: 0 22px;
          border-radius: 999px;
          text-decoration: none;
          background: linear-gradient(135deg, ${THEME.colors.ink}, #182235);
          color: #fff;
          font-size: 14px;
          font-weight: 900;
          box-shadow: 0 16px 32px rgba(15,23,42,0.18);
          white-space: nowrap;
        }
        .heroBtnJournal {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 50px;
          padding: 0 18px;
          border-radius: 999px;
          text-decoration: none;
          background: rgba(79,70,229,0.08);
          border: 1px solid rgba(79,70,229,0.22);
          color: ${THEME.colors.accent};
          font-size: 14px;
          font-weight: 900;
          white-space: nowrap;
          transition: background 0.18s;
        }
        .heroBtnJournal:hover {
          background: rgba(79,70,229,0.14);
        }
        .heroBtnGame {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 50px;
          padding: 0 18px;
          border-radius: 999px;
          text-decoration: none;
          background: rgba(124,58,237,0.08);
          border: 1px solid rgba(124,58,237,0.22);
          color: ${THEME.colors.vip};
          font-size: 14px;
          font-weight: 900;
          white-space: nowrap;
          transition: background 0.18s;
        }
        .heroBtnGame:hover {
          background: rgba(124,58,237,0.14);
        }
        .heroNote {
          margin-top: 16px;
          color: ${THEME.colors.faint};
          font-size: 13px;
          font-weight: 600;
        }
        .heroRight {
          display: flex;
          align-items: center;
          justify-content: stretch;
          min-width: 0;
        }

        @media (max-width: 1180px) {
          .heroGrid {
            grid-template-columns: minmax(0, 1fr) 420px;
          }
          .heroTitle {
            font-size: 48px;
          }
        }

        @media (max-width: 960px) {
          .heroWrap {
            padding: 16px;
          }
          .heroGrid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .heroLeft {
            min-height: auto;
            padding: 0;
          }
          .heroTitle {
            font-size: 32px;
            max-width: none;
            margin-top: 14px;
          }
          .heroDesc {
            max-width: none;
            font-size: 14px;
            line-height: 1.7;
            margin-top: 14px;
          }
          .heroTags {
            margin-top: 14px;
            gap: 8px;
          }
          .heroActions {
            margin-top: 16px;
            gap: 8px;
          }
          .heroBtnPrimary,
          .heroBtnJournal,
          .heroBtnGame {
            min-height: 44px;
            padding: 0 14px;
            font-size: 13px;
          }
          .heroNote {
            margin-top: 12px;
            font-size: 12px;
          }
        }

        @media (max-width: 640px) {
          .heroWrap {
            padding: 14px;
          }
          .heroTitle {
            font-size: 28px;
            line-height: 1.06;
            max-width: 320px;
          }
          .heroDesc {
            font-size: 13px;
            line-height: 1.65;
            margin-top: 12px;
          }
          .heroTags {
            margin-top: 12px;
          }
          .heroActions {
            margin-top: 14px;
            gap: 7px;
          }
          .heroEyebrow {
            font-size: 11px;
            padding: 7px 11px;
          }
          .heroBtnPrimary,
          .heroBtnJournal,
          .heroBtnGame {
            min-height: 42px;
            padding: 0 13px;
            font-size: 12px;
          }
        }

        @media (max-width: 520px) {
          .heroTitle {
            max-width: 280px;
            font-size: 26px;
          }
          .heroDesc {
            max-width: 320px;
          }
          .heroTags {
            display: none;
          }
          .heroNote {
            display: none;
          }
          .heroBtnPrimary,
          .heroBtnJournal,
          .heroBtnGame {
            min-height: 40px;
            font-size: 12px;
            padding: 0 11px;
          }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(79,70,229,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.26,
          pointerEvents: "none",
        }}
      />

      <div className="heroWrap">
        <div className="heroGrid">
          <div className="heroLeft">
            <div className="heroEyebrow">
              <span className="heroEyebrowDot" />
              English Scene Library
            </div>

            <h1 className="heroTitle">
              用真实场景，
              <br />
              学会真正能说出口的英语
            </h1>

            <div className="heroDesc">
              精选英语短片、双语字幕与词汇卡片，把零散输入变成更有沉淀感的学习体验。
            </div>

            <div className="heroTags">
              <MiniTag>场景短片</MiniTag>
              <MiniTag>双语字幕</MiniTag>
              <MiniTag>词汇卡片</MiniTag>
            </div>

            <div className="heroActions">
              <a href="#all" className="heroBtnPrimary">
                浏览内容库
              </a>
              <a href="/journal" className="heroBtnJournal">
                📒 记学习手帐
              </a>
              <a href="/practice" className="heroBtnGame">
                🎮 词汇闯关
              </a>
            </div>

            <div className="heroNote">更适合想系统积累口语表达的人。</div>
          </div>

          <div className="heroRight">{featured}</div>
        </div>
      </div>
    </section>
  );
}
