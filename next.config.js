/** @type {import('next').NextConfig} */

const RAILWAY_BASE =
  process.env.RAILWAY_API_URL ||
  "https://railway.nailaobao.top";

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "imagedelivery.net" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/cf-img/:path*",
        destination: "https://imagedelivery.net/:path*",
      },
      // YouTube 缩略图在国内被墙，通过 Vercel 边缘节点反代
      {
        source: "/yt-img/:path*",
        destination: "https://i.ytimg.com/:path*",
      },
      {
        source: "/api/:path*",
        destination: `${RAILWAY_BASE}/api/:path*`,
      },
      {
        source: "/rsc-api/:path*",
        destination: `${RAILWAY_BASE}/rsc-api/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=30, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
