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
          line-height: 1.2;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

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

        /* 📱 手机端极限压缩优化区 */
        @media (max-width: 640px) {
          .howWrap { padding: 20px 16px; border-radius: 24px; margin-top: 12px;}
          .howHeader { margin-bottom: 12px; }
          
          /* 将整个 Grid 从 3列 改为 1列，并拉近上下距离 */
          .stepsGrid { grid-template-columns: 1fr; gap: 10px; }
          
          /* 核心魔法：手机端将卡片内部强行转换为精简的横向 Grid 布局 */
          .stepCard {
            display: grid;
            grid-template-columns: 44px 1fr; /* 左图 44px 宽，右边自适应 */
            grid-template-rows: auto auto;
            align-items: center;
            column-gap: 12px;
            row-gap: 4px;
            padding: 12px 14px; /* 极简上下 Padding */
            border-radius: 16px;
          }

          /* 接管原本包裹 Icon 和 STEP 的 Header */
          .stepHeader {
            grid-column: 1;
            grid-row: 1 / 3; /* 跨两行，类似左侧头像 */
            margin-bottom: 0;
            flex-direction: column; /* 图标在上，STEP 标在下 */
            justify-content: center;
            gap: 4px;
          }

          /* 将标题移至右侧第一行 */
          .stepTitle {
            grid-column: 2;
            grid-row: 1;
            margin-bottom: 0;
            font-size: 15px;
            align-self: flex-end; /* 文字沉底对齐 */
          }

          /* 将描述移至右侧第二行 */
          .stepDesc {
            grid-column: 2;
            grid-row: 2;
            font-size: 12px;
            line-height: 1.4;
            align-self: flex-start;
          }

          /* 精简内部元素大小 */
          .stepIconWrapper { width: 34px; height: 34px; font-size: 16px; }
          .stepIndex { font-size: 9px; letter-spacing: 0; }
        }
      `}</style>

      <div className="howGrid">
        {/* 左侧：精简文案区 */}
        <div className="howHeader">
          <div className="howBadge">⚡ 核心学习法</div>
          <h2 className="howTitle">三步闭环<br/>消化实境语料</h2>
          <div className="howSub">摒弃无效播放，用最符合脑科学的方式重塑语感。</div>
        </div>

        {/* 右侧：超紧凑的三联卡片 */}
        <div className="stepsGrid">
          <StepCard
            index="01"
            icon="🎧"
            title="沉浸式盲听感知"
            desc="脱离字幕舒适区，抓取真实语境，唤醒耳朵母语本能。"
          />
          <StepCard
            index="02"
            icon="✨"
            title="语料级拆解精读"
            desc="配合双语字幕与词汇卡片，将语音流切分为高频表达。"
          />
          <StepCard
            index="03"
            icon="🎯"
            title="肌肉记忆输出"
            desc="二刷跟读复述结合手帐，将输入固化为脱口而出的直觉。"
          />
        </div>
      </div>
    </div>
  );
}
