// app/components/home/HowItWorks.jsx
import { THEME } from "./theme";

function StepCard({ index, title, desc, icon }) {
  return (
    <div className="stepCard">
      <div className="stepHeader">
        <div className="stepIconWrapper">
          <span className="stepIcon">{icon}</span>
          <div className="stepGlow"></div>
        </div>
        <div className="stepIndex">STEP {index}</div>
      </div>
      <h3 className="stepTitle">{title}</h3>
      <p className="stepDesc">{desc}</p>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <div className="howWrap">
      <style>{`
        .howWrap {
          margin-top: 16px; 
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,252,0.98));
          border: 1px solid rgba(255,255,255,0.8);
          box-shadow: 0 14px 30px rgba(15,23,42,0.04);
          padding: 24px 32px;
          backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
        }

        .howGrid {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 32px;
          align-items: center;
        }

        .howHeader {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .howBadge {
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(79,70,229,0.08);
          border: 1px solid rgba(79,70,229,0.15);
          color: #4f46e5;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }

        .howTitle {
          font-size: 22px;
          font-weight: 900;
          line-height: 1.3;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        
        .desktop-br { display: block; }

        .howSub {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.6;
          color: #64748b;
          font-weight: 500;
        }

        .stepsGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .stepCard {
          position: relative;
          padding: 16px 18px;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid rgba(15,23,42,0.06);
          box-shadow: 0 6px 20px rgba(15,23,42,0.02);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1;
        }

        .stepCard:hover {
          transform: translateY(-2px);
          border-color: rgba(79,70,229,0.2);
          box-shadow: 0 12px 24px rgba(79,70,229,0.06);
        }

        .stepHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .stepIconWrapper {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border: 1px solid rgba(15,23,42,0.05);
          display: grid;
          place-items: center;
          font-size: 16px;
          z-index: 2;
        }

        .stepIndex {
          font-size: 11px;
          font-weight: 900;
          color: #cbd5e1;
          letter-spacing: 0.05em;
        }

        .stepTitle {
          font-size: 15px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .stepDesc {
          font-size: 12px;
          line-height: 1.5;
          color: #64748b;
          font-weight: 500;
        }

        @media (max-width: 960px) {
          .howGrid { grid-template-columns: 1fr; gap: 20px; }
          .howWrap { padding: 24px 20px; }
          .howHeader { align-items: flex-start; }
          .howTitle { max-width: 400px; }
        }

        /* 📱 手机端极限压缩优化区：将占用空间压缩至半屏 */
        @media (max-width: 640px) {
          .howWrap { padding: 14px 16px; border-radius: 20px; margin-top: 10px; }
          .howGrid { gap: 12px; }
          
          /* 头部在手机端变成横向流排版，消灭回车带来的大量空白 */
          .howHeader { 
            flex-direction: row; 
            flex-wrap: wrap; 
            align-items: center; 
            gap: 6px; 
            margin-bottom: 0;
          }
          .howBadge { margin-bottom: 0; padding: 2px 8px; font-size: 10px; }
          .desktop-br { display: none; } /* 消除强制换行 */
          .howTitle { font-size: 17px; margin-bottom: 0; line-height: 1.2; }
          .howSub { font-size: 12px; margin-top: 2px; width: 100%; margin-bottom: 2px;}

          .stepsGrid { grid-template-columns: 1fr; gap: 8px; }
          
          /* 卡片在手机端被极限拍扁 */
          .stepCard {
            display: grid;
            grid-template-columns: 32px 1fr; /* 左图极限缩减到 32px 宽 */
            grid-template-rows: auto auto;
            align-items: center;
            column-gap: 10px;
            row-gap: 2px;
            padding: 10px 12px; /* 内部留白收到最小 */
            border-radius: 14px;
          }

          .stepHeader {
            grid-column: 1;
            grid-row: 1 / 3;
            margin-bottom: 0;
            flex-direction: column;
            justify-content: center;
            gap: 2px;
          }

          .stepTitle {
            grid-column: 2;
            grid-row: 1;
            margin-bottom: 0;
            font-size: 14px;
            align-self: flex-end;
          }

          .stepDesc {
            grid-column: 2;
            grid-row: 2;
            font-size: 11px;
            line-height: 1.4;
            align-self: flex-start;
          }

          .stepIconWrapper { width: 32px; height: 32px; font-size: 14px; }
          .stepIndex { font-size: 9px; letter-spacing: 0; transform: scale(0.9); }
        }
      `}</style>

      <div className="howGrid">
        <div className="howHeader">
          <div className="howBadge">⚡ 核心功能闭环</div>
          {/* 加入 desktop-br 类，确保电脑端折行，手机端不折行 */}
          <h2 className="howTitle">三步闭环，<br className="desktop-br"/>消化实境语料</h2>
          <div className="howSub">摒弃无效播放，用最符合脑科学的方式重塑语感。</div>
        </div>

        <div className="stepsGrid">
          <StepCard
            index="01"
            icon="🎧"
            title="实境视频盲听"
            desc="看实境短片脱离字幕，抓取真实语速情绪，唤醒母语本能。"
          />
          <StepCard
            index="02"
            icon="✨"
            title="双语字幕与词汇卡"
            desc="开启交互双语字幕与卡片，将语音流切分为可复用的专属语料。"
          />
          <StepCard
            index="03"
            icon="🎮"
            title="游戏闯关与手帐"
            desc="通过游戏闯关检测输出，结合数据手帐将沉淀的语料化为直觉。"
          />
        </div>
      </div>
    </div>
  );
}
