import PenguinWrapper from "./components/PenguinWrapper";
import BuyFloatBtn from "./components/BuyFloatBtn";

export const metadata = {
  title: "油管英语场景库 — 精选场景短片·双语字幕·词汇卡片",
  description: "精选 YouTube 场景短片，配合双语字幕与词汇卡片。用更低成本、更高频率的方式，持续把输入变成输出，把口语练到敢开口。",
  keywords: "英语学习, YouTube场景, 双语字幕, 词汇卡片, 口语练习, 英语听力",
  openGraph: {
    title: "油管英语场景库",
    description: "精选 YouTube 场景短片，配合双语字幕与词汇卡片",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <style>{`
          *, *::before, *::after { -webkit-tap-highlight-color: transparent; }
          :focus-visible { outline: 2px solid rgba(99,102,241,0.5); outline-offset: 2px; }
          :focus:not(:focus-visible) { outline: none; }
        `}</style>
      </head>
      <body style={{ margin: 0 }}>
        {children}
        <PenguinWrapper />
        <BuyFloatBtn />
      </body>
    </html>
  );
}
