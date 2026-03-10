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
          margin-top: 32px;
          border-radius: 32px;
          background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,252,0.95));
          border: 1px solid rgba(255,255,255,0.8);
          box-shadow: 0 20px 60px rgba(15,23,42,0.05);
          padding: 40px;
          backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
        }
        
        /* 顶部装饰光效 */
        .howWrap::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(79,70,229,0.3), transparent);
        }

        .howHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .howTitle {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .howSub {
          margin-top: 8px;
          font-size: 14px;
          color: #64748b;
          font-weight: 600;
        }

        .howBadge {
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(79,70,229,0.08);
          border: 1px solid rgba(79,70,229,0.15);
          color: #4f46e5;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .stepsGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        /* 独立卡片动感设计 */
        .stepCard {
          position: relative;
          padding: 24px;
          border-radius: 24px;
          background: #ffffff;
          border: 1px solid rgba(15,23,42,0.06);
          box-shadow: 0 10px 30px rgba(15,23,42,0.02);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1;
          overflow: hidden;
        }

        .stepCard:hover {
          transform: translateY(-5px);
          border-color: rgba(79,70,229,0.2);
          box-shadow: 0 20px 40px rgba(79,70,229,0.08);
        }

        /* 悬浮时的底层光晕 */
        .stepCard::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(79,70,229,0.03), transparent);
          opacity: 0;
          transition: opacity 0.4s ease;
          z-index: -1;
        }
        .stepCard:hover::after { opacity: 1; }

        .stepHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .stepIconWrapper {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border: 1px solid rgba(15,23,42,0.05);
          display: grid;
          place-items: center;
          font-size: 22px;
          z-index: 2;
        }

        .stepGlow {
          position: absolute;
          inset: -10px;
          background: radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: -1;
        }
        .stepCard:hover .stepGlow { opacity: 1; }

        .stepIndex {
          font-size: 12px;
          font-weight: 900;
          color: #cbd5e1;
          letter-spacing: 0.1em;
          transition: color 0.3s ease;
        }
        .stepCard:hover .stepIndex { color: #818cf8; }

        .stepTitle {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 10px;
        }

        .stepDesc {
          font-size: 14px;
          line-height: 1.7;
          color: #64748b;
          font-weight: 500;
        }

        @media (max-width: 960px) {
          .howWrap { padding: 32px 24px; }
          .stepsGrid { grid-template-columns: 1fr; gap: 16px; }
        }

        @media (max-width: 640px) {
          .howWrap { padding: 24px 16px; border-radius: 24px; }
          .howTitle { font-size: 20px; }
          .stepCard { padding: 20px; }
        }
      `}</style>

      <div className="howHeader">
        <div>
          <h2 className="howTitle">三步闭环，彻底消化实境语料</h2>
          <div className="howSub">摒弃无效播放，用最符合脑科学的方式重塑语感。</div>
        </div>
        <div className="howBadge">⚡ 核心学习法</div>
      </div>

      <div className="stepsGrid">
        <StepCard
          index="01"
          icon="🎧"
          title="沉浸式盲听感知"
          desc="脱离字幕的舒适区，优先抓取真实语速下的情绪与语境，唤醒耳朵的母语本能。"
        />
        <StepCard
          index="02"
          icon="✨"
          title="语料级拆解精读"
          desc="开启交互式双语字幕，配合词汇卡片，将模糊的语音流精准切分为可复用的高频表达。"
        />
        <StepCard
          index="03"
          icon="🎯"
          title="肌肉记忆输出"
          desc="二刷三刷跟读复述，结合数据手帐与闯关机制，将瞬时输入真正固化为脱口而出的直觉。"
        />
      </div>
    </div>
  );
}
