// app/components/home/HowItWorks.jsx
import { THEME } from "./theme";

function Step({ index, title, desc }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "36px 1fr",
        gap: 12,
        alignItems: "start",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: "linear-gradient(135deg, rgba(79,70,229,0.12), rgba(6,182,212,0.12))",
          border: `1px solid ${THEME.colors.line}`,
          display: "grid",
          placeItems: "center",
          fontSize: 13,
          fontWeight: 900,
          color: THEME.colors.ink,
          boxShadow: "0 8px 20px rgba(79,70,229,0.08)",
        }}
      >
        {index}
      </div>

      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: THEME.colors.ink,
            lineHeight: 1.4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 4,
            color: THEME.colors.muted,
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <div
      style={{
        marginTop: 4,
        borderRadius: 20,
        background: "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.68))",
        border: `1px solid ${THEME.colors.border}`,
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
        padding: 18,
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 950,
              color: THEME.colors.ink,
              lineHeight: 1.3,
            }}
          >
            一条视频，也能形成完整学习闭环
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: THEME.colors.faint,
              lineHeight: 1.6,
            }}
          >
            更适合忙碌的人，稳定、轻量，但有积累感。
          </div>
        </div>

        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(79,70,229,0.08)",
            border: `1px solid ${THEME.colors.line}`,
            color: "#3730a3",
            fontSize: 12,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          学习方法建议
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
        }}
      >
        <Step
          index="01"
          title="先完整看一遍，先抓语境，不急着逐词拆解"
          desc="先建立对场景、语气和表达意图的整体感觉，让输入先进入真实语境。"
        />
        <Step
          index="02"
          title="打开字幕和词汇卡，把关键表达一口一口吃透"
          desc="遇到值得复用的句子和词组时，直接结合字幕位置、例句和中文解释理解它。"
        />
        <Step
          index="03"
          title="二刷三刷，跟读复述，让输入开始变成输出"
          desc="重复听、跟着读、尝试复述，比一次性猛学更容易把表达留在脑子里。"
        />
      </div>
    </div>
  );
}
