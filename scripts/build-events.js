// Gộp các file JSON trong content/events/ thành data/events.json để trang tĩnh fetch().
// Không dùng package ngoài — chỉ Node core (fs, path, fetch có sẵn từ Node 18).
"use strict";

const fs = require("fs");
const path = require("path");

const eventsDir = path.join(__dirname, "..", "content", "events");
const outDir = path.join(__dirname, "..", "data");
const outFile = path.join(outDir, "events.json");

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineMd(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

// Markdown -> HTML tối giản, có chủ đích (chỉ hỗ trợ đoạn văn, danh sách, tiêu đề, in đậm/nghiêng, link http/https).
// Input đã được escape HTML trước, nên output không thể chứa thẻ ngoài whitelist ở trên.
function markdownToHtml(md) {
  if (!md) return "";
  const lines = escapeHtml(md).split(/\r?\n/);
  let html = "";
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "") {
      if (inList) { html += "</ul>"; inList = false; }
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inlineMd(listMatch[1])}</li>`;
      continue;
    }
    if (inList) { html += "</ul>"; inList = false; }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html += `<h${level}>${inlineMd(headingMatch[2])}</h${level}>`;
      continue;
    }

    html += `<p>${inlineMd(line)}</p>`;
  }
  if (inList) html += "</ul>";
  return html;
}

function isSafeUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

const CATEGORIES = [
  { value: "an-ninh-mang", label: "An ninh mạng" },
  { value: "chuyen-doi-so", label: "Chuyển đổi số" },
  { value: "doi-moi-sang-tao", label: "Đổi mới sáng tạo" },
  { value: "nghien-cuu-khoa-hoc", label: "Nghiên cứu khoa học" },
  { value: "khac", label: "Khác" },
];
const CATEGORY_VALUES = new Set(CATEGORIES.map((c) => c.value));
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

// Du lieu cu (truoc khi co truong category) mac dinh la "An ninh mang" vi
// toan bo su kien tao truoc do deu thuoc chu de nay.
function normalizeCategory(value) {
  return typeof value === "string" && CATEGORY_VALUES.has(value) ? value : "an-ninh-mang";
}

// Chuyen link YouTube/Google Drive dang xem thuong sang dang embed de nhung
// truc tiep bang iframe. Link khong nhan dien duoc van giu lai o videoUrl
// de hien thi nhu link thuong (mo qua modal), chi videoEmbedUrl la null.
function toEmbedUrl(url) {
  if (!isSafeUrl(url)) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (u.pathname.startsWith("/embed/")) return url;
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    }
    if (host === "drive.google.com") {
      const match = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function isSafeImagePath(src) {
  return typeof src === "string" && (src.startsWith("/uploads/") || src.startsWith("uploads/"));
}

function slugFromFilename(file) {
  const base = path.basename(file, ".json");
  return base.replace(/[^a-zA-Z0-9-]+/g, "-");
}

// Chap nhan ca dinh dang cu (images: ["/uploads/a.jpg"]) lan dinh dang moi
// (images: [{image, featured}]) de khong hong du lieu cu.
function normalizeImages(rawImages) {
  if (!Array.isArray(rawImages)) return [];
  return rawImages
    .map((item) => {
      if (typeof item === "string") {
        return isSafeImagePath(item) ? { src: item, featured: false } : null;
      }
      if (item && typeof item === "object" && isSafeImagePath(item.image)) {
        return { src: item.image, featured: item.featured === true };
      }
      return null;
    })
    .filter(Boolean);
}

function loadIndividualEvents() {
  let files = [];
  try {
    files = fs.readdirSync(eventsDir).filter((f) => f.endsWith(".json"));
  } catch (e) {
    files = [];
  }

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(eventsDir, file), "utf8");
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        console.warn(`Bỏ qua file lỗi định dạng: ${file}`);
        return null;
      }
      const category = normalizeCategory(data.category);
      const videoUrl = isSafeUrl(data.video) ? data.video : "";
      return {
        slug: slugFromFilename(file),
        title: typeof data.title === "string" ? data.title : "",
        category,
        categoryLabel: CATEGORY_LABELS[category],
        planNumber: typeof data.planNumber === "string" ? data.planNumber : "",
        date: typeof data.date === "string" ? data.date : "",
        location: typeof data.location === "string" ? data.location : "",
        bodyHtml: markdownToHtml(data.body || ""),
        images: normalizeImages(data.images),
        featuredImage: isSafeImagePath(data.featuredImage) ? data.featuredImage : "",
        link: isSafeUrl(data.link) ? data.link : "",
        videoUrl,
        videoEmbedUrl: videoUrl ? toEmbedUrl(videoUrl) : null,
      };
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------
// Lo hang loat dang cho (tuy chon): admin tai 1 file .xlsx qua /admin ->
// "Nhap hang loat (Excel)", CMS ghi lai duong dan trong content/nhap-hang-loat.json.
// Moi lan build deu doc lai file .xlsx do + tim anh khop ma trong uploads/
// (KHONG xoa/di chuyen gi - build khong the ghi nguoc lai repo). Vi vay day
// la du lieu "song" theo dung file .xlsx dang duoc tro toi tai thoi diem
// build, KHONG phai file rieng vinh vien - xem docs/PROJECT.md muc
// "Nhap hang loat" ve quy tac "1 lo tai 1 thoi diem, chot xong roi moi tai lo moi".
function loadPendingBatchEvents(existingSlugs) {
  const pendingPath = path.join(__dirname, "..", "content", "nhap-hang-loat.json");
  try {
    const pendingRaw = fs.readFileSync(pendingPath, "utf8");
    const pendingData = JSON.parse(pendingRaw);
    const xlsxRelPath = typeof pendingData.file === "string" ? pendingData.file.replace(/^\//, "") : "";
    if (!xlsxRelPath) return [];

    const xlsxAbsPath = path.join(__dirname, "..", xlsxRelPath);
    const buf = fs.readFileSync(xlsxAbsPath);
    const { parseEventsWorkbook } = require("./lib/xlsx-events");
    const { items, warnings } = parseEventsWorkbook(buf);
    warnings.forEach((w) => console.warn(`[nhap-hang-loat] ${w}`));

    const uploadsDirForScan = path.join(__dirname, "..", "uploads");
    let uploadFiles = [];
    try {
      uploadFiles = fs.readdirSync(uploadsDirForScan);
    } catch (e) {
      uploadFiles = [];
    }

    const pendingEvents = items.map((item) => {
      const baseSlug = `${item.date}-${item.title
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}`;
      let slug = baseSlug || `${item.date}-su-kien`;
      let n = 2;
      while (existingSlugs.has(slug)) slug = `${baseSlug}-${n++}`;
      existingSlugs.add(slug);

      const re = new RegExp(`^${item.code}[-_](\\d+)\\.(jpg|jpeg|png|gif|webp)$`, "i");
      const images = uploadFiles
        .map((name) => {
          const m = re.exec(name);
          return m ? { name, order: parseInt(m[1], 10) } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.order - b.order)
        .map((f, i) => ({ src: `/uploads/${f.name}`, featured: i === 0 }));

      const videoUrl = item.video || "";
      return {
        slug,
        title: item.title,
        category: item.category,
        categoryLabel: CATEGORY_LABELS[item.category],
        planNumber: item.planNumber,
        date: item.date,
        location: item.location,
        bodyHtml: markdownToHtml(item.body || ""),
        images,
        featuredImage: "",
        link: item.link,
        videoUrl,
        videoEmbedUrl: videoUrl ? toEmbedUrl(videoUrl) : null,
      };
    });
    if (pendingEvents.length) {
      console.log(`[nhap-hang-loat] Ghép thêm ${pendingEvents.length} hoạt động từ ${xlsxRelPath} (chưa chốt file riêng).`);
    }
    return pendingEvents;
  } catch (e) {
    // Chua co file nao duoc tai len qua nut "Nhap hang loat (Excel)" - bo qua, khong loi.
    return [];
  }
}

// ---------------------------------------------------------------------
// Feed hoạt động tự động từ hvcsnd.edu.vn (trang chính thống của Học viện
// CSND — Học viện không có RSS công khai, xem scripts/build-ticker.js).
// Quét trang "tag" của từng danh mục, lấy tối đa N bài mới nhất mỗi danh
// mục. KHÔNG ghi file gì — chạy lại (và tự cập nhật) ở MỌI lần build.
// Trang không có ngày đăng hiển thị rõ, nhưng đường dẫn ảnh trên CDN của
// họ luôn theo dạng /uploads/YYYY/MM/DD/... rất sát ngày đăng thật, nên
// dùng tạm làm ngày hiển thị.
// ---------------------------------------------------------------------
const ACTIVITY_FEED_SOURCES = [
  { url: "https://hvcsnd.edu.vn/tag/chuyen-doi-so-3340", category: "chuyen-doi-so" },
  { url: "https://hvcsnd.edu.vn/tag/doi-moi-sang-tao-1884", category: "doi-moi-sang-tao" },
  { url: "https://hvcsnd.edu.vn/tag/nghien-cuu-khoa-hoc-207", category: "nghien-cuu-khoa-hoc" },
];
const ACTIVITY_FEED_MAX_PER_CATEGORY = 9;
const ACTIVITY_FEED_TIMEOUT_MS = 12000;
const ACTIVITY_FEED_TRUSTED_IMAGE_HOST = "https://cdn.hvcsnd.edu.vn/";

function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// Trang tag co nhieu bien the layout (khac class/the bao quanh tuy vi tri),
// nen khong dua vao 1 div bao ngoai co dinh - tim truc tiep tung the tieu
// de <h1|h2 class="headline...">, roi lay ngay/anh tu doan HTML NGAY TRUOC
// no (anh minh hoa luon nam truoc tieu de trong cung 1 muc).
function parseHvcsndTagPage(html) {
  const items = [];
  const seenUrls = new Set();
  const headlineRegex = /<h[12] class="headline[^"]*">\s*<a href="([^"]+)" title="([^"]*)"/g;
  let m;
  while ((m = headlineRegex.exec(html))) {
    const href = m[1];
    const title = decodeHtmlEntities(m[2]);
    if (!href || !title) continue;
    const url = href.startsWith("http") ? href : `https://hvcsnd.edu.vn${href}`;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const windowStart = Math.max(0, m.index - 700);
    const before = html.slice(windowStart, m.index);

    const dateMatches = [...before.matchAll(/uploads\/(\d{4})\/(\d{2})\/(\d{2})\//g)];
    const lastDate = dateMatches[dateMatches.length - 1];
    const date = lastDate ? `${lastDate[1]}-${lastDate[2]}-${lastDate[3]}` : null;

    const imgMatches = [...before.matchAll(/<img[^>]*\bsrc="(https:\/\/cdn\.hvcsnd\.edu\.vn\/[^"]+)"/g)];
    const lastImg = imgMatches[imgMatches.length - 1];
    const image = lastImg ? decodeHtmlEntities(lastImg[1]).replace(/&amp;/g, "&") : null;

    items.push({
      url,
      title,
      date,
      image: image && image.startsWith(ACTIVITY_FEED_TRUSTED_IMAGE_HOST) ? image : null,
    });
  }
  return items;
}

async function fetchActivityFeedSource({ url, category }) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ACTIVITY_FEED_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`[activity-feed] Bỏ qua ${category}: HTTP ${res.status}`);
      return [];
    }
    const html = await res.text();
    const items = parseHvcsndTagPage(html).slice(0, ACTIVITY_FEED_MAX_PER_CATEGORY);
    console.log(`[activity-feed] ${category}: lấy ${items.length} tin từ hvcsnd.edu.vn`);
    return items.map((it) => ({ ...it, category }));
  } catch (e) {
    console.warn(`[activity-feed] Lỗi lấy tin ${category}: ${e.message}`);
    return [];
  }
}

async function loadActivityFeedEvents(existingSlugs, existingUrls) {
  const results = await Promise.all(ACTIVITY_FEED_SOURCES.map(fetchActivityFeedSource));
  const items = results.flat();
  const today = new Date().toISOString().slice(0, 10);

  return items
    .filter((it) => !existingUrls.has(it.url))
    .map((it) => {
      const baseSlug = `feed-${it.title
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}`;
      let slug = baseSlug || `feed-${it.category}-${existingSlugs.size}`;
      let n = 2;
      while (existingSlugs.has(slug)) slug = `${baseSlug}-${n++}`;
      existingSlugs.add(slug);
      existingUrls.add(it.url);

      return {
        slug,
        title: it.title,
        category: it.category,
        categoryLabel: CATEGORY_LABELS[it.category],
        planNumber: "",
        date: it.date || today,
        location: "",
        bodyHtml: "",
        images: it.image ? [{ src: it.image, featured: true }] : [],
        featuredImage: "",
        link: it.url,
        videoUrl: "",
        videoEmbedUrl: null,
      };
    });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const events = loadIndividualEvents();
  const existingSlugs = new Set(events.map((e) => e.slug));
  const existingUrls = new Set(events.map((e) => e.link).filter(Boolean));

  const pendingEvents = loadPendingBatchEvents(existingSlugs);
  events.push(...pendingEvents);
  pendingEvents.forEach((e) => { if (e.link) existingUrls.add(e.link); });

  let feedEvents = [];
  try {
    feedEvents = await loadActivityFeedEvents(existingSlugs, existingUrls);
  } catch (e) {
    console.warn(`[activity-feed] Bỏ qua toàn bộ feed do lỗi không mong đợi: ${e.message}`);
  }
  events.push(...feedEvents);

  // So sanh ISO date dang chuoi (YYYY-MM-DD) - luon dat gan nhat len dau, bat
  // ke thu tu nhap lieu truoc/sau. Tra ve 0 khi bang nhau de giu thu tu on
  // dinh (Array.sort da bao dam stable tu ES2019).
  events.sort((a, b) => {
    if (a.date === b.date) return 0;
    return a.date < b.date ? 1 : -1;
  });

  const featured = [];
  let imageCount = 0;
  for (const ev of events) {
    for (const img of ev.images) {
      imageCount++;
      if (img.featured) {
        featured.push({
          src: img.src,
          eventSlug: ev.slug,
          eventTitle: ev.title,
          eventDate: ev.date,
        });
      }
    }
    if (ev.featuredImage) {
      featured.push({
        src: ev.featuredImage,
        eventSlug: ev.slug,
        eventTitle: ev.title,
        eventDate: ev.date,
      });
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    stats: {
      eventCount: events.length,
      imageCount,
    },
    categories: CATEGORIES,
    featured,
    events,
  };

  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    `Đã tạo ${events.length} sự kiện (${imageCount} ảnh, ${featured.length} ảnh nổi bật) vào ${path.relative(process.cwd(), outFile)}`
  );
}

main().catch((e) => {
  console.error("Lỗi không mong đợi khi build events:", e);
  process.exitCode = 1;
});
