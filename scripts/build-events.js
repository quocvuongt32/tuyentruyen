// Gộp các file JSON trong content/events/ thành data/events.json để trang tĩnh fetch().
// Không dùng package ngoài — chỉ Node core (fs, path).
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

fs.mkdirSync(outDir, { recursive: true });

let files = [];
try {
  files = fs.readdirSync(eventsDir).filter((f) => f.endsWith(".json"));
} catch (e) {
  files = [];
}

const events = files
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
  .filter(Boolean)
  .sort((a, b) => (a.date < b.date ? 1 : -1));

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
