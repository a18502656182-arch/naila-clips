// app/layout.js
export const metadata = {
  title: "Naila Clips (RSC Lab)",
  description: "Experimental RSC version",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
