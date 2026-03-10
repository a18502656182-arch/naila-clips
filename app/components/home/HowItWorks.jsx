// app/components/home/HowItWorks.jsx
import { THEME } from "./theme";

function StepCard({ index, title, desc, icon }) {
  return (
    <div className="stepCard">
      <div className="stepIconCol">
        <div className="stepIconWrapper">
          <span className="stepIcon">{icon}</span>
          <div className="stepGlow"></div>
        </div>
        <div className="stepIndex">STEP {index}</div>
      </div>
      <div className="stepTextCol">
        <h3 className="stepTitle">{title}</h3>
        <p className="stepDesc">{desc}</p>
      </div>
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

        /* 电脑端头部排版 */
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
          margin: 0;
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

        /* 卡片基础排版（电脑端） */
        .stepCard {
          position: relative;
          padding: 16px 18px;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid rgba(15,23,42,0.06);
          box-shadow: 0 6px 20px rgba(15,23,42,0.02);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1;
          display: flex;
          flex-direction: column;
        }

        .stepCard:hover {
          transform: translateY(-2px);
          border-color: rgba(79,70,229,0.2);
          box-shadow: 0 12px 24px rgba(79,70,229,0.06);
        }

        .stepIconCol {
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

        .stepTextCol {
          display: flex;
          flex-direction: column;
        }

        .stepTitle {
          font-size: 15px;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 6px 0;
        }

        .stepDesc {
          font-size: 12px;
          line-height: 1.5;
          color: #64748b;
          font-weight: 500;
          margin: 0;
        }

        @media (max-width: 960px) {
          .howGrid { grid-template-columns: 1fr; gap: 20px; }
          .howWrap { padding: 24px 20px; }
          .howHeader { align-items: flex-start; }
          .howTitle { max-width: 400px; }
        }

        /* 📱 手机端：极限压缩与绝对左对齐 */
        @media (max-width: 640px) {
          .howWrap { padding: 16px 16px; border-radius: 20px; margin-top: 10px; }
          .howGrid { gap: 16px; }
          
          /* 1. 解决黄框没对齐：强制改为上下堆叠，绝对靠左 */
          .howHeader { 
            flex-direction: column; 
            align-items: flex-start; /* 完美左对齐 */
            gap: 6px; 
            margin-bottom: 0;
          }
          .howBadge { margin: 0; padding: 4px 10px; font-size: 10px; }
          .desktop-br { display: none; } 
          .howTitle { font-size: 18px; margin: 0; line-height: 1.3; }
          .howSub { font-size: 12px; margin: 0; }

          .stepsGrid { grid-template-columns: 1fr; gap: 10px; }
          
          /* 2. 解决卡片黄框没对齐：改为横向排版，并隐藏乱跑的 STEP 01 */
          .stepCard {
            flex-direction: row; /* 图标在左，文字在右 */
            align-items: flex-start;
            padding: 12px 14px; 
            gap: 12px;
            border-radius: 16px;
          }

          .stepIconCol {
            margin-bottom: 0; 
            flex-shrink: 0; 
          }
          
          /* 手机端直接隐藏 STEP 文字，让对齐变得无懈可击 */
          .stepIndex { display: none; }

          .stepTextCol {
            gap: 4px;
            padding-top: 2px;
          }

          .stepTitle { font-size: 14px; margin: 0; }
          .stepDesc { font-size: 11px; line-height: 1.5; margin: 0; }
        }
      `}</style>

      <div className="howGrid">
        <div className="howHeader">
          <div className="howBadge">💡 怎么学最有效？</div>
          <h2 className="howTitle">一条短片的<br className="desktop-br"/>完整学习闭环</h2>
          <div className="howSub">看懂不是目的，能张口说出来才是。</div>
        </div>

        <div className="stepsGrid">
          <StepCard
            index="01"
            icon="🎧"
            title="原声视频找语感"
            desc="看油管真实短片，先挑战一下不看字幕，在真实场景里感受老外怎么说话。"
          />
          <StepCard
            index="02"
            icon="✨"
            title="精读查漏存单词"
            desc="听不懂打开双语字幕。遇到好用的生词和表达，一键收藏到专属词汇本。"
          />
          <StepCard
            index="03"
            icon="🎮"
            title="玩闯关记手帐"
            desc="光看不练假把式。去大厅把生词玩成通关游戏，最后在手帐打卡今日战绩。"
          />
        </div>
      </div>
    </div>
  );
}
