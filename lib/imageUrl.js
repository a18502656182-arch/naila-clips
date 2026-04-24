const CF_IMAGE_HOST = "https://imagedelivery.net";
const CF_PROXY_PREFIX = "/cf-img";

const YT_IMAGE_HOST = "https://i.ytimg.com";
const YT_PROXY_PREFIX = "/yt-img";

export function proxyCoverUrl(url) {
  if (!url) return null;
  if (url.startsWith(CF_IMAGE_HOST)) {
    // 去掉末尾变体名，换成压缩参数
    const base = url.slice(CF_IMAGE_HOST.length).replace(/\/[^/]+$/, "");
    return CF_PROXY_PREFIX + base + "/w=400,quality=80,format=webp";
  }
  if (url.startsWith(YT_IMAGE_HOST)) {
    return YT_PROXY_PREFIX + url.slice(YT_IMAGE_HOST.length);
  }
  return url;
}
