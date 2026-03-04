/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "imagedelivery.net" },
    ],
  },

  // imagedelivery.net (Cloudflare Images) 在国内被墙
  // 通过 Vercel 边缘节点反代，浏览器请求 /cf-img/... 即可
  async rewrites() {
    return [
      {
        source: "/cf-img/:path*",
        destination: "https://imagedelivery.net/:path*",
      },
    ];
  },

  async headers() {
    return [
      {
        // ✅ 只给首页 document 加 CDN 缓存策略
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            // 解释：
            // - 浏览器仍然 max-age=0（每次都会校验）
            // - CDN/Vercel 边缘允许 s-maxage=30 复用
            // - 允许 stale-while-revalidate，效果会非常接近参考站的 STALE
            value: "public, max-age=0, s-maxage=30, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
