import PenguinMascot from "./components/PenguinMascot";

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
      <body style={{ margin: 0 }}>
        {children}
        <PenguinMascot />
      </body>
    </html>
  );
}
