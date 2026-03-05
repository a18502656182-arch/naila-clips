"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ── 台词库 ────────────────────────────────────────────────
const LINES = {
  // 刚打开页面（登录用户）
  welcome: [
    "你终于来了，我还以为你放弃学英语了呢 (叹气)",
    "哦？今天居然主动来了，进步了哦～",
    "欢迎回来！我一直在这守着，脚都站麻了",
    "来啦来啦！快开始，别辜负今天的好状态",
    "嗯哼，今天的你看起来特别能学进去的样子",
  ],
  // 未登录用户
  guest: [
    "登录之后才能收藏词汇哦，我帮你看着呢 🐧",
    "注册一下吧，就两秒钟，我等你～",
    "游客模式？那多没意思，登录才有专属记录！",
  ],
  // 在视频页待了一会儿
  watching: [
    "哇！你的大脑正在疯狂吸收地道发音，我看见它在发光了！",
    "专注看视频中……本企鹅表示赞许 👍",
    "这句台词你仔细听了吗？原声的节奏感才是精华！",
    "沉浸式学习 ing……你现在的状态比教室里认真多了",
    "连我都想跟着一起学了，你这么专注干嘛的！",
  ],
  // 收藏了词汇
  saved: [
    "又抓到一个宝！生词本里的词越来越多，厉害了",
    "收藏了！记得去考试页练一练，不然只是收藏了个寂寞",
    "好词！我替你记住了。但你也要记住哦～",
    "这个词值得收藏，你眼光不错嘛",
  ],
  // 做题答对
  correct: [
    "答对了！这个词已经被你驯服了 ✅",
    "嗯！就是这样！继续保持这个节奏！",
    "答对了～我就知道你会的，你比你想象的厉害",
    "完全正确！大脑转速正常，继续！",
  ],
  // 做题答错
  wrong: [
    "哎呀，这个词明明刚收藏过，你的记忆被外星人吃掉了吗？",
    "错了没关系，错了才会记住嘛——这是科学！",
    "嗯……这道题有点狠。但你肯定下次会的",
    "答错了？我相信这只是意外，你一定知道的！",
    "没关系，错一次记十年，反而赚了",
  ],
  // 完成今日任务
  allDone: [
    "今天的任务全部完成！本企鹅为你骄傲！🎉",
    "完美打卡！今天也是没被英语打败的一天！",
    "全部搞定！你今天比昨天的你强了，悄悄记住这个感觉",
    "任务完成！你现在可以理直气壮地摸鱼了（不对）",
  ],
  // 闲置提醒（超过2分钟没操作）
  idle: [
    "喂喂，你还在吗？别走神啊，英语在等你呢",
    "我注意到你已经停下来好一会儿了……在想什么呢？",
    "发呆也是学习的一部分吗？（不是）快回来！",
    "别愣着了，点开一个视频，只看一个就好",
  ],
  // 连续学习多天
  streak: [
    "你已经连续学习好几天了，这种毅力真的比我见过的大多数人都强！",
    "连续打卡中……你知道吗，坚持才是最难的，而你正在做",
  ],
};

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 全局事件总线（让其他组件触发企鹅台词）
const listeners = new Set();
export function triggerPenguin(event) {
  listeners.forEach(fn => fn(event));
}

export default function PenguinMascot() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [bounce, setBounce] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const hideTimer = useRef(null);
  const idleTimer = useRef(null);
  const hasGreeted = useRef(false);
  const lastActivity = useRef(Date.now());

  const show = useCallback((msg) => {
    clearTimeout(hideTimer.current);
    setText(msg);
    setVisible(true);
    setShowBubble(true);
    setBounce(true);
    setTimeout(() => setBounce(false), 600);
    // 8秒后自动收起气泡（企鹅本体保留）
    hideTimer.current = setTimeout(() => setShowBubble(false), 8000);
  }, []);

  // 监听全局事件
  useEffect(() => {
    const handler = (event) => {
      if (minimized) return;
      if (event === "correct") show(getRandom(LINES.correct));
      else if (event === "wrong") show(getRandom(LINES.wrong));
      else if (event === "saved") show(getRandom(LINES.saved));
      else if (event === "allDone") show(getRandom(LINES.allDone));
      else if (event === "watching") show(getRandom(LINES.watching));
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, [show, minimized]);

  // 初次加载欢迎语
  useEffect(() => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;
    const timer = setTimeout(() => {
      try {
        const token = localStorage.getItem("sb_access_token");
        if (token) show(getRandom(LINES.welcome));
        else show(getRandom(LINES.guest));
      } catch {
        show(getRandom(LINES.welcome));
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [show]);

  // 闲置检测
  useEffect(() => {
    const resetIdle = () => { lastActivity.current = Date.now(); };
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("click", resetIdle);
    window.addEventListener("keydown", resetIdle);
    window.addEventListener("scroll", resetIdle);

    idleTimer.current = setInterval(() => {
      if (minimized) return;
      if (Date.now() - lastActivity.current > 120000) { // 2分钟
        show(getRandom(LINES.idle));
        lastActivity.current = Date.now(); // 重置，避免连续触发
      }
    }, 15000);

    return () => {
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("click", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      window.removeEventListener("scroll", resetIdle);
      clearInterval(idleTimer.current);
    };
  }, [show, minimized]);

  return (
    <>
      <style>{`
        @keyframes penguinBounce {
          0%,100%{transform:translateY(0)}
          30%{transform:translateY(-10px)}
          60%{transform:translateY(-5px)}
        }
        @keyframes penguinFloat {
          0%,100%{transform:translateY(0px)}
          50%{transform:translateY(-4px)}
        }
        @keyframes bubbleIn {
          0%{opacity:0;transform:translateY(10px) scale(0.92)}
          100%{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes bubbleOut {
          0%{opacity:1;transform:scale(1)}
          100%{opacity:0;transform:scale(0.92)}
        }
      `}</style>

      <div style={{
        position: "fixed", bottom: 24, right: 20, zIndex: 9000,
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
        pointerEvents: "none",
      }}>
        {/* 气泡 */}
        {showBubble && !minimized && (
          <div style={{
            pointerEvents: "auto",
            maxWidth: 220, padding: "10px 14px",
            background: "#fff", borderRadius: 16,
            border: "1px solid rgba(99,102,241,0.20)",
            boxShadow: "0 8px 30px rgba(11,18,32,0.14)",
            fontSize: 13, lineHeight: 1.5, color: "#0b1220", fontWeight: 600,
            animation: "bubbleIn 280ms cubic-bezier(.2,.9,.2,1)",
            position: "relative",
          }}>
            {text}
            {/* 小三角 */}
            <div style={{
              position: "absolute", bottom: -7, right: 26,
              width: 14, height: 8, overflow: "hidden",
            }}>
              <div style={{
                width: 12, height: 12,
                background: "#fff",
                border: "1px solid rgba(99,102,241,0.20)",
                transform: "rotate(45deg)", marginTop: -6, marginLeft: 1,
                boxShadow: "2px 2px 4px rgba(11,18,32,0.06)",
              }} />
            </div>
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowBubble(false)}
              style={{
                position: "absolute", top: 6, right: 8,
                width: 18, height: 18, borderRadius: 999,
                background: "rgba(11,18,32,0.06)", border: "none",
                cursor: "pointer", fontSize: 10, color: "#64748b",
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}>✕</button>
          </div>
        )}

        {/* 企鹅本体 */}
        <div
          onClick={() => {
            if (minimized) {
              setMinimized(false);
              show(getRandom(LINES.welcome));
            } else {
              setShowBubble(v => !v);
              if (!showBubble) show(getRandom([...LINES.welcome, ...LINES.watching, ...LINES.idle]));
            }
          }}
          style={{
            pointerEvents: "auto",
            width: 52, height: 52, borderRadius: "50%",
            background: "linear-gradient(135deg,#0f172a,#4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, cursor: "pointer",
            boxShadow: "0 6px 24px rgba(79,70,229,0.35)",
            animation: bounce ? "penguinBounce 600ms ease" : "penguinFloat 3s ease-in-out infinite",
            transition: "transform 150ms, box-shadow 150ms",
            userSelect: "none",
            border: "2px solid rgba(255,255,255,0.15)",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.12)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(79,70,229,0.50)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 24px rgba(79,70,229,0.35)"; }}
          title={minimized ? "点击唤醒企鹅助手" : "点击和企鹅说话"}
        >
          🐧
        </div>

        {/* 最小化按钮 */}
        {!minimized && (
          <button
            onClick={() => { setMinimized(true); setShowBubble(false); }}
            style={{
              pointerEvents: "auto",
              fontSize: 10, color: "rgba(11,18,32,0.35)", background: "none",
              border: "none", cursor: "pointer", padding: "2px 6px",
              fontWeight: 600,
            }}
          >隐藏</button>
        )}
      </div>
    </>
  );
}
