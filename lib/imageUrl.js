/**
 * imageUrl.js
 *
 * 国内被墙的图片域名通过 Vercel rewrite 反代绕过：
 *   imagedelivery.net → /cf-img/...
 *   i.ytimg.com       → /yt-img/...
 *
 * next.config.js 里配置了对应的 rewrite 规则，
 * Vercel 边缘节点在海外，可以正常访问这些域名。
 */

const CF_IMAGE_HOST = "https://imagedelivery.net";
const CF_PROXY_PREFIX = "/cf-img";

const YT_IMAGE_HOST = "https://i.ytimg.com";
const YT_PROXY_PREFIX = "/yt-img";

/**
 * 将图片 URL 转换为本站反代路径。
 * - imagedelivery.net → /cf-img/...
 * - i.ytimg.com       → /yt-img/...
 * - 其他 URL 原样返回
 *
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function proxyCoverUrl(url) {
  if (!url) return null;
  if (url.startsWith(CF_IMAGE_HOST)) {
    return CF_PROXY_PREFIX + url.slice(CF_IMAGE_HOST.length);
  }
  if (url.startsWith(YT_IMAGE_HOST)) {
    return YT_PROXY_PREFIX + url.slice(YT_IMAGE_HOST.length);
  }
  return url;
}
