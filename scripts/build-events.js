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
    return {
      slug: slugFromFilename(file),
      title: typeof data.title === "string" ? data.title : "",
      date: typeof data.date === "string" ? data.date : "",
      location: typeof data.location === "string" ? data.location : "",
      bodyHtml: markdownToHtml(data.body || ""),
      images: normalizeImages(data.images),
      link: isSafeUrl(data.link) ? data.link : "",
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
}

const payload = {
  generatedAt: new Date().toISOString(),
  stats: {
    eventCount: events.length,
    imageCount,
  },
  featured,
  events,
};

fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
console.log(
  `Đã tạo ${events.length} sự kiện (${imageCount} ảnh, ${featured.length} ảnh nổi bật) vào ${path.relative(process.cwd(), outFile)}`
);
