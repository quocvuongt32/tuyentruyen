// Gộp tin tức cho dải chạy (ticker) đầu trang: lấy tin thời sự từ RSS chính thống
// của Bộ Công an + tin do admin tự chọn dán vào content/ticker/, ghi ra data/ticker.json.
// Không dùng package ngoài — chỉ Node core (fs, path, fetch có sẵn từ Node 18).
"use strict";

const fs = require("fs");
const path = require("path");

const tickerDir = path.join(__dirname, "..", "content", "ticker");
const outDir = path.join(__dirname, "..", "data");
const outFile = path.join(outDir, "ticker.json");

// Các nguồn RSS chính thống đã xác minh hoạt động (Cổng TTĐT Bộ Công an).
// Học viện CSND và một số báo Đảng không có RSS công khai ổn định — admin có thể
// bổ sung tin của các nguồn đó thủ công qua content/ticker/ (mục "Tin liên quan" trong /admin).
const RSS_SOURCES = [
  { url: "https://bocongan.gov.vn/api/rss/36.xml", source: "Bộ Công an – Chỉ đạo điều hành" },
  { url: "https://bocongan.gov.vn/api/rss/35.xml", source: "Bộ Công an – Hoạt động CAND" },
];

const PRIORITY_KEYWORDS = [
  "chuyển đổi số",
  "nghị quyết 57",
  "nghị quyết số 57",
  "an ninh mạng",
  "an toàn thông tin",
  "khoa học công nghệ",
  "đổi mới sáng tạo",
];

const FETCH_TIMEOUT_MS = 12000;
const MAX_ITEMS = 16;
const MAX_PER_SOURCE = 10;

function isSafeUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .trim();
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? decodeEntities(m[1]) : "";
}

function parseRssItems(xml, source) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml))) {
    const block = m[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    if (!title || !isSafeUrl(link)) continue;
    const date = pubDate ? new Date(pubDate) : null;
    items.push({
      title,
      url: link,
      source,
      date: date && !isNaN(date.getTime()) ? date.toISOString() : null,
    });
  }
  return items;
}

async function fetchFeed({ url, source }) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`[ticker] Bỏ qua ${source}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = parseRssItems(xml, source).slice(0, MAX_PER_SOURCE);
    console.log(`[ticker] ${source}: lấy ${items.length} tin`);
    return items;
  } catch (e) {
    console.warn(`[ticker] Lỗi lấy tin từ ${source}: ${e.message}`);
    return [];
  }
}

function loadCuratedItems() {
  let files = [];
  try {
    files = fs.readdirSync(tickerDir).filter((f) => f.endsWith(".json"));
  } catch (e) {
    return [];
  }
  return files
    .map((file) => {
      let data;
      try {
        data = JSON.parse(fs.readFileSync(path.join(tickerDir, file), "utf8"));
      } catch (e) {
        console.warn(`[ticker] Bỏ qua file lỗi định dạng: ${file}`);
        return null;
      }
      if (typeof data.title !== "string" || !data.title.trim() || !isSafeUrl(data.url)) return null;
      const date = typeof data.date === "string" ? new Date(data.date) : null;
      return {
        title: data.title.trim(),
        url: data.url,
        source: typeof data.source === "string" && data.source.trim() ? data.source.trim() : "Tin liên quan",
        date: date && !isNaN(date.getTime()) ? date.toISOString() : null,
      };
    })
    .filter(Boolean);
}

function matchesPriority(title) {
  const lower = title.toLowerCase();
  return PRIORITY_KEYWORDS.some((kw) => lower.includes(kw));
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const feedResults = await Promise.all(RSS_SOURCES.map(fetchFeed));
  const liveItems = feedResults.flat();
  const curatedItems = loadCuratedItems();

  const seen = new Set();
  const all = [...curatedItems, ...liveItems].filter((it) => {
    if (seen.has(it.url)) return false;
    seen.add(it.url);
    return true;
  });

  const priority = all.filter((it) => matchesPriority(it.title) || it.source === "Tin liên quan" || !RSS_SOURCES.some((s) => s.source === it.source));
  const rest = all.filter((it) => !priority.includes(it));

  const byDateDesc = (a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date < a.date ? -1 : 1;
  };
  priority.sort(byDateDesc);
  rest.sort(byDateDesc);

  const items = [...priority, ...rest].slice(0, MAX_ITEMS);

  const payload = {
    generatedAt: new Date().toISOString(),
    items,
  };

  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[ticker] Đã ghi ${items.length} tin vào ${path.relative(process.cwd(), outFile)}`);
}

main().catch((e) => {
  console.error("[ticker] Lỗi không mong đợi, ghi file rỗng để không chặn build:", e);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), items: [] }, null, 2), "utf8");
});
