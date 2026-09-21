const SOURCES = {
  mps: {
    name: "Bộ Công an",
    url: "https://www.bocongan.gov.vn/tag/701",
    base: "https://www.bocongan.gov.vn",
  },
  government: {
    name: "Báo Chính phủ",
    url: "https://baochinhphu.vn/chuyen-doi-so.html",
    base: "https://baochinhphu.vn",
  },
};

const CACHE_SECONDS = 6 * 60 * 60;

function decodeHtml(value = "") {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(parseInt(decimal, 10)))
    .replace(/&([a-z]+);/gi, (all, name) => named[name.toLowerCase()] ?? all);
}

function plainText(value = "") {
  return decodeHtml(String(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function attribute(tag, name) {
  const match = String(tag).match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"));
  return match ? decodeHtml(match[1]).trim() : "";
}

function absoluteUrl(value, source) {
  try {
    const url = new URL(value, source.base);
    if (url.protocol !== "https:" || url.hostname !== new URL(source.base).hostname) return "";
    return url.href;
  } catch (_) {
    return "";
  }
}

function isoDate(value) {
  const match = String(value).match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function shorten(value, max = 360) {
  const text = plainText(value);
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

export function parseMps(html) {
  const source = SOURCES.mps;
  const items = [];
  const articles = String(html).match(/<article\b[^>]*>[\s\S]*?<\/article>/gi) || [];

  for (const block of articles) {
    const linkTag = block.match(/<a\b[^>]*href=["'][^"']*\/bai-viet\/[^"']+["'][^>]*>/i)?.[0] || "";
    const href = attribute(linkTag, "href");
    const url = absoluteUrl(href, source);
    if (!url) continue;

    const imageTag = block.match(/<img\b[^>]*alt=["'][^"']+["'][^>]*>/i)?.[0] || "";
    const heading = block.match(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/i)?.[1] || "";
    const title = shorten(attribute(imageTag, "alt") || heading, 190);
    if (!title) continue;

    const text = plainText(block);
    const dates = [...text.matchAll(/\b\d{2}\/\d{2}\/\d{4}\b/g)];
    const dateText = dates.at(-1)?.[0] || "";
    let summary = text.startsWith(title) ? text.slice(title.length).trim() : text;
    if (dateText && summary.endsWith(dateText)) summary = summary.slice(0, -dateText.length).trim();

    items.push({
      title,
      summary: shorten(summary),
      url,
      date: isoDate(dateText),
      source: source.name,
      sourceKey: "mps",
    });
    if (items.length >= 12) break;
  }
  return items;
}

export function parseGovernment(html) {
  const source = SOURCES.government;
  const items = [];
  const pattern = /<div\b[^>]*class=["'][^"']*\bbox-stream-item\b[^"']*["'][^>]*>([\s\S]*?)(?=<div\b[^>]*class=["'][^"']*\bbox-stream-item\b|<div\b[^>]*class=["'][^"']*\bbox-stream-load\b|<\/section>)/gi;

  for (const match of String(html).matchAll(pattern)) {
    const block = match[0];
    const linkTag = block.match(/<a\b[^>]*class=["'][^"']*\bbox-stream-link-title\b[^"']*["'][^>]*>/i)?.[0] || "";
    const href = attribute(linkTag, "href");
    const url = absoluteUrl(href, source);
    const title = shorten(attribute(linkTag, "title") || plainText(linkTag), 190);
    if (!url || !title || href.includes("/chu-de/")) continue;

    const summary = block.match(/<p\b[^>]*class=["'][^"']*\bbox-stream-sapo\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] || "";
    const timeTag = block.match(/<span\b[^>]*class=["'][^"']*\bbox-stream-time\b[^"']*["'][^>]*>[\s\S]*?<\/span>/i)?.[0] || "";
    const dateText = plainText(timeTag);

    items.push({
      title,
      summary: shorten(summary.replace(/^\s*\(Chinhphu\.vn\)\s*-?\s*/i, "")),
      url,
      date: isoDate(dateText),
      source: source.name,
      sourceKey: "government",
    });
    if (items.length >= 12) break;
  }
  return items;
}

function mergeRoundRobin(groups, limit = 10) {
  const merged = [];
  for (let index = 0; merged.length < limit; index += 1) {
    let added = false;
    for (const group of groups) {
      if (group[index]) {
        merged.push(group[index]);
        added = true;
        if (merged.length >= limit) break;
      }
    }
    if (!added) break;
  }
  return merged;
}

export function extractStats(items) {
  const pattern = /\b\d[\d.,]*\s*(?:%|tỷ(?:\s*đồng)?|triệu|nghìn|ngàn|điểm trường|giao dịch|hồ sơ|dịch vụ|tài khoản|người|tổ chức|quốc gia|nước|ngày)\b/iu;
  const candidates = [];
  const seen = new Set();

  items.forEach((item, index) => {
    const sentences = `${item.title}. ${item.summary || ""}`.split(/(?<=[.!?])\s+/);
    const context = sentences.find((sentence) => pattern.test(sentence));
    const value = context?.match(pattern)?.[0] || "";
    const key = `${value.toLowerCase()}|${item.url}`;
    if (!value || seen.has(key)) return;
    seen.add(key);
    candidates.push({
      value,
      context: shorten(context, 180),
      url: item.url,
      source: item.source,
      date: item.date,
      score: /%|tỷ|triệu|nghìn|ngàn|điểm trường|giao dịch|hồ sơ|dịch vụ|tài khoản|người|tổ chức/iu.test(value) ? 2 : 1,
      index,
    });
  });
  return candidates
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map(({ score, index, ...stat }) => stat);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "CamNangAnToanSo/1.0 (+https://tuyentruyen.khoaktt.vn/)",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function buildPayload() {
  const [mpsResult, governmentResult] = await Promise.allSettled([
    fetchText(SOURCES.mps.url),
    fetchText(SOURCES.government.url),
  ]);
  const mps = mpsResult.status === "fulfilled" ? parseMps(mpsResult.value) : [];
  const government = governmentResult.status === "fulfilled" ? parseGovernment(governmentResult.value) : [];
  const allItems = mergeRoundRobin([mps, government], 24);
  const items = allItems.slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    items,
    stats: extractStats(allItems),
    sources: [
      { name: SOURCES.mps.name, url: SOURCES.mps.url, ok: mps.length > 0 },
      { name: SOURCES.government.name, url: SOURCES.government.url, ok: government.length > 0 },
    ],
  };
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=900, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function onRequestGet(context) {
  const cacheKey = new Request(new URL("/api/quick-news", context.request.url), { method: "GET" });
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cached = cache ? await cache.match(cacheKey) : null;
  if (cached) return cached;

  try {
    const payload = await buildPayload();
    const response = json(payload, payload.items.length ? 200 : 502);
    if (cache && payload.items.length) {
      const write = cache.put(cacheKey, response.clone());
      if (typeof context.waitUntil === "function") context.waitUntil(write);
      else await write;
    }
    return response;
  } catch (error) {
    console.error("Quick news update failed", error);
    return json({ generatedAt: new Date().toISOString(), items: [], stats: [], sources: [] }, 502);
  }
}

export function onRequest() {
  return json({ success: false, message: "Method not allowed." }, 405);
}
