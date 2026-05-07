// app/guide/page.js
import Link from "next/link";
import WechatButton from "./WechatButton";


const STEPS = [
  { num: "1", title: "选片段，建语感", content: "在首页按话题或剧集筛选你感兴趣的内容，感兴趣的主题学起来事半功倍。点开一个片段，先不看字幕整体看一遍，熟悉语境和语速。" },
  { num: "2", title: "精学一个片段", content: "觉得太快就调到 0.75x，打开双语字幕再看一遍。结合词汇卡理解片段里的单词、短语和地道表达，遇到不认识的词直接点字幕查词，有意思的表达点词汇卡里的收藏存到词汇本。" },
  { num: "3", title: "开口说出来", content: "打开单句暂停，每句播完之后凭记忆复述，反复几遍直到能脱口而出。最后挑战自己：关字幕、调回原速，跟着视频实时跟读，模仿语速、发音、语调和节奏。" },
  { num: "4", title: "练耳朵", content: "打开听写模式，播完一句写下你听到的，没听清就开单句循环反复听，写完所有字幕后打开英文字幕对照，记下没听出来的词，针对有困难的部分重点循环。" },
  { num: "5", title: "复习，别让词白学", content: "学完当天打开词汇本，看看今天收藏的词，进词汇游戏用6种不同的游戏模式巩固记忆，玩一轮下来印象深刻多了。" },
  { num: "6", title: "打卡，看到自己的进步", content: "每天学完在手帐页查看今日任务完成状态和学习热力图，生成打卡海报记录自己的连续学习天数，坚持下去你会惊讶于自己的进步。" },
];

const FEATURES = [
  { icon: "🎬", title: "动态双语字幕", desc: "按语义群手工对齐，支持双语/英文/中文切换，单句暂停和单句循环。" },
  { icon: "🔍", title: "点词查词", desc: "点击字幕里任意单词，弹出音标、词性、中文释义。" },
  { icon: "📚", title: "词汇卡", desc: "精选表达附音标、中英释义和例句，点字幕块直接播放对应片段。" },
  { icon: "🎧", title: "听写模式", desc: "播放一句写下听到的，配合单句循环反复练，练听力的神器。" },
  { icon: "🎮", title: "词汇游戏", desc: "6种游戏模式巩固记忆，玩一轮下来印象深刻多了。" },
  { icon: "📒", title: "学习手帐", desc: "热力图、连续打卡天数，生成打卡海报分享给朋友。" },
];

export default async function GuidePage() {
  const wechatQrUrl = "/cf-img/qvilyoTfnpu3-vu3LTcGwQ/7416f983-b4dc-4be0-b6a5-7ec5b6b8e800/qr";
  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fd", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        .guide-nav {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(11,18,32,0.07);
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .guide-mobile { display: block; }
        .guide-desktop { display: none; }

        /* ══ 手机端 ══ */
        .m-hero { background: #0f172a; padding: 28px 20px 24px; color: #fff; }
        .m-hero-label { font-size: 10px; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.08em; margin-bottom: 8px; }
        .m-hero-title { font-size: 22px; font-weight: 900; line-height: 1.3; margin-bottom: 8px; }
        .m-hero-desc { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.75; margin: 0; }

        .m-section { padding: 24px 16px; }
        .m-section-title { font-size: 15px; font-weight: 900; color: #0b1220; margin-bottom: 14px; }

        .m-feat-list { display: flex; flex-direction: column; gap: 8px; }
        .m-feat-item {
          display: flex; align-items: flex-start; gap: 12px;
          background: #fff; border-radius: 12px;
          border: 1px solid rgba(11,18,32,0.07); padding: 12px 14px;
        }
        .m-feat-icon-wrap {
          width: 32px; height: 32px; border-radius: 8px;
          background: rgba(99,102,241,0.08);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; flex-shrink: 0;
        }
        .m-feat-name { font-size: 13px; font-weight: 800; color: #0b1220; margin-bottom: 2px; }
        .m-feat-desc { font-size: 12px; color: rgba(11,18,32,0.55); line-height: 1.65; }

        .m-steps { display: flex; flex-direction: column; }
        .m-step { display: flex; gap: 12px; align-items: flex-start; }
        .m-step-left { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
        .m-step-num {
          width: 26px; height: 26px; border-radius: 50%;
          background: #0f172a; color: #fff;
          font-size: 12px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }
        .m-step-line { width: 1px; flex: 1; min-height: 16px; background: rgba(11,18,32,0.12); margin: 4px 0; }
        .m-step-body { padding-bottom: 16px; flex: 1; padding-top: 3px; }
        .m-step-title { font-size: 14px; font-weight: 800; color: #0b1220; margin-bottom: 4px; }
        .m-step-content { font-size: 12px; color: rgba(11,18,32,0.55); line-height: 1.7; }

        .m-bottom { background: #0f172a; padding: 28px 16px 40px; }
        .m-bottom-card {
          background: rgba(255,255,255,0.07); border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.1); padding: 16px; margin-bottom: 12px;
        }
        .m-bottom-card:last-child { margin-bottom: 0; }
        .m-bottom-title { font-size: 14px; font-weight: 900; color: #fff; margin-bottom: 8px; }
        .m-bottom-desc { font-size: 12px; color: rgba(255,255,255,0.55); line-height: 1.75; margin-bottom: 14px; }
        .m-btn {
          display: block; text-align: center; padding: 11px 0; border-radius: 999px;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: #fff; text-decoration: none; font-size: 14px; font-weight: 800;
          box-shadow: 0 6px 16px rgba(99,102,241,0.35);
        }

        /* ══ 电脑端 ══ */
        @media (min-width: 900px) {
          .guide-mobile { display: none; }
          .guide-desktop { display: block; }

          .d-hero {
            background: #0f172a; padding: 52px 64px; color: #fff;
            display: grid; grid-template-columns: 1fr 360px; gap: 64px; align-items: center;
          }
          .d-hero-label { font-size: 11px; color: rgba(255,255,255,0.35); letter-spacing: 0.1em; margin-bottom: 14px; }
          .d-hero-title { font-size: 40px; font-weight: 950; line-height: 1.2; margin-bottom: 14px; letter-spacing: -0.02em; }
          .d-hero-desc { font-size: 15px; color: rgba(255,255,255,0.55); line-height: 1.8; max-width: 520px; margin: 0; }

          .d-hero-card {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .d-hero-card-item {
            background: rgba(255,255,255,0.07);
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.1);
            padding: 20px 22px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }
          .d-hero-card-title { font-size: 15px; font-weight: 900; color: #fff; }
          .d-hero-card-sub { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 4px; }
          .d-hero-btn {
            display: inline-flex; align-items: center; justify-content: center;
            padding: 10px 20px; border-radius: 999px; flex-shrink: 0;
            background: linear-gradient(135deg, #8b5cf6, #6366f1);
            color: #fff; text-decoration: none; font-size: 13px; font-weight: 800;
            box-shadow: 0 4px 14px rgba(99,102,241,0.4); white-space: nowrap;
          }

          .d-body { padding: 52px 64px 64px; background: #f7f8fd; display: flex; flex-direction: column; gap: 52px; }

          .d-sec-title {
            font-size: 20px; font-weight: 950; color: #0b1220;
            margin-bottom: 20px; padding-bottom: 12px;
            border-bottom: 1px solid rgba(11,18,32,0.08);
            letter-spacing: -0.01em;
          }

          .d-feat-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
          }
          .d-feat-card {
            background: #fff; border-radius: 14px;
            border: 1px solid rgba(11,18,32,0.07);
            padding: 18px 20px; display: flex; gap: 14px; align-items: flex-start;
            box-shadow: 0 2px 8px rgba(11,18,32,0.04);
          }
          .d-feat-icon-wrap {
            width: 38px; height: 38px; border-radius: 10px;
            background: rgba(99,102,241,0.08);
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; flex-shrink: 0;
          }
          .d-feat-name { font-size: 15px; font-weight: 800; color: #0b1220; margin-bottom: 5px; }
          .d-feat-desc { font-size: 13px; color: rgba(11,18,32,0.55); line-height: 1.7; }

          .d-steps-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
          }
          .d-step-card {
            background: #fff; border-radius: 14px;
            border: 1px solid rgba(11,18,32,0.07);
            padding: 18px 20px;
            box-shadow: 0 2px 8px rgba(11,18,32,0.04);
          }
          .d-step-num {
            width: 28px; height: 28px; border-radius: 50%;
            background: #0f172a; color: #fff;
            font-size: 12px; font-weight: 900;
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 12px;
          }
          .d-step-title { font-size: 15px; font-weight: 800; color: #0b1220; margin-bottom: 6px; }
          .d-step-content { font-size: 13px; color: rgba(11,18,32,0.55); line-height: 1.75; }


        }
      `}</style>

      {/* 导航 */}
      <div className="guide-nav">
        <Link href="/" style={{ fontSize: 13, color: "rgba(11,18,32,0.5)", textDecoration: "none", fontWeight: 600 }}>← 回首页</Link>
        <span style={{ color: "rgba(11,18,32,0.2)" }}>|</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#0b1220" }}>使用指南</span>
      </div>

      {/* ══ 手机端 ══ */}
      <div className="guide-mobile">
        <div className="m-hero">
          <div className="m-hero-label">YOUTUBE SCENE LIBRARY</div>
          <h1 className="m-hero-title">怎么用奶酪包英语场景库学英语</h1>
          <p className="m-hero-desc">近 500 期真实英语场景短片，油管博主 vlog + 影视美剧双板块，双语字幕 + 词汇卡，帮你在真实语境里学地道英语。</p>
        </div>

        <div className="m-section">
          <div className="m-section-title">🛠️ 这里有什么</div>
          <div className="m-feat-list">
            {FEATURES.map((f, i) => (
              <div key={i} className="m-feat-item">
                <div className="m-feat-icon-wrap">{f.icon}</div>
                <div>
                  <div className="m-feat-name">{f.title}</div>
                  <div className="m-feat-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="m-section" style={{ paddingTop: 0 }}>
          <div className="m-section-title">📋 完整学习步骤</div>
          <div className="m-steps">
            {STEPS.map((s, i) => (
              <div key={i} className="m-step">
                <div className="m-step-left">
                  <div className="m-step-num">{s.num}</div>
                  {i < STEPS.length - 1 && <div className="m-step-line" />}
                </div>
                <div className="m-step-body">
                  <div className="m-step-title">{s.title}</div>
                  <div className="m-step-content">{s.content}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="m-bottom">
          <div className="m-bottom-card">
            <div className="m-bottom-title">✨ 关于会员</div>
            <div className="m-bottom-desc">免费片段随便看，会员解锁全站近 500 期所有内容，油管和美剧两个板块全部解锁。支持支付宝购买，有月卡、季卡、年卡和永久卡可以选。</div>
            <a href="/buy" className="m-btn">立即开通会员 →</a>
          </div>
          <div className="m-bottom-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div className="m-bottom-title" style={{ marginBottom: 4 }}>💬 联系客服</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>购买咨询、使用问题、对网站的任何建议都可以加微信联系我们。</div>
            </div>
            <WechatButton wechatQrUrl={wechatQrUrl} btnStyle="light" compact />
          </div>
        </div>
      </div>

      {/* ══ 电脑端 ══ */}
      <div className="guide-desktop">
        <div className="d-hero">
          <div>
            <div className="d-hero-label">YOUTUBE SCENE LIBRARY · 使用指南</div>
            <h1 className="d-hero-title">怎么用奶酪包英语场景库学英语</h1>
            <p className="d-hero-desc">近 500 期真实英语场景短片，油管博主 vlog + 影视美剧双板块，覆盖生活、日常、学习、影视等实用场景，用真实内容轻松摆脱哑巴英语。</p>
          </div>
          <div className="d-hero-card">
            <div className="d-hero-card-item">
              <div>
                <div className="d-hero-card-title">✨ 开通会员</div>
                <div className="d-hero-card-sub">解锁全站所有内容</div>
              </div>
              <a href="/buy" className="d-hero-btn">立即开通 →</a>
            </div>
            <div className="d-hero-card-item">
              <div>
                <div className="d-hero-card-title">💬 联系客服</div>
                <div className="d-hero-card-sub">购买咨询 · 使用问题</div>
              </div>
              <WechatButton wechatQrUrl={wechatQrUrl} btnStyle="light" />
            </div>
          </div>
        </div>

        <div className="d-body">
          <div>
            <div className="d-sec-title">🛠️ 这里有什么</div>
            <div className="d-feat-grid">
              {FEATURES.map((f, i) => (
                <div key={i} className="d-feat-card">
                  <div className="d-feat-icon-wrap">{f.icon}</div>
                  <div>
                    <div className="d-feat-name">{f.title}</div>
                    <div className="d-feat-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="d-sec-title">📋 完整学习步骤</div>
            <div className="d-steps-grid">
              {STEPS.map((s, i) => (
                <div key={i} className="d-step-card">
                  <div className="d-step-num">{s.num}</div>
                  <div className="d-step-title">{s.title}</div>
                  <div className="d-step-content">{s.content}</div>
                </div>
              ))}
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
