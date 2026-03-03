/**
 * imageUrl.js
 *
 * imagedelivery.net 在国内被墙，通过 Vercel rewrite 反代绕过：
 *   https://imagedelivery.net/<account>/<imageId>/<variant>
 *   → /cf-img/<account>/<imageId>/<variant>
 *
 * next.config.js 里配置了对应的 rewrite 规则，
 * Vercel 边缘节点在海外，可以正常访问 imagedelivery.net。
 */

const CF_IMAGE_HOST = "https://imagedelivery.net";
const PROXY_PREFIX = "/cf-img";

/**
 * 将 imagedelivery.net 的图片 URL 转换为本站反代路径。
 * 非 imagedelivery.net 的 URL 原样返回。
 *
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function proxyCoverUrl(url) {
  if (!url) return null;
  if (url.startsWith(CF_IMAGE_HOST)) {
    return PROXY_PREFIX + url.slice(CF_IMAGE_HOST.length);
  }
  return url;
}
