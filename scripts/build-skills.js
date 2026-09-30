// Gộp content/ky-nang/*.json (Bộ kỹ năng An toàn số — ảnh/infographic về thủ đoạn
// lừa đảo và cách phòng ngừa) thành data/skills.json để trang tĩnh fetch().
// Không dùng package ngoài — chỉ Node core (fs, path).
"use strict";

const fs = require("fs");
const path = require("path");
const { renderBlocks } = require("./lib/rich-content");

const skillsDir = path.join(__dirname, "..", "content", "ky-nang");
const outDir = path.join(__dirname, "..", "data");
const outFile = path.join(outDir, "skills.json");
const includeUnpublished = process.env.INCLUDE_UNPUBLISHED === "1";

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

function markdownToHtml(md) {
  if (!md) return "";
  const lines = escapeHtml(md).split(/\r?\n/);
  let html = "";
  let inList = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
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
    } else {
      html += `<p>${inlineMd(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

function normalizeImages(data) {
  const raw = Array.isArray(data.images) ? data.images : [];
  const images = raw
    .map((item) => {
      if (typeof item === "string") return isSafeImagePath(item) ? { src: item, role: "gallery", caption: "" } : null;
      if (!item || !isSafeImagePath(item.image)) return null;
      return { src: item.image, role: item.role === "cover" ? "cover" : "gallery", caption: typeof item.caption === "string" ? item.caption.slice(0, 260) : "" };
    })
    .filter(Boolean);
  if (isSafeImagePath(data.image) && !images.some((item) => item.src === data.image)) images.unshift({ src: data.image, role: "cover", caption: "" });
  return images;
}

fs.mkdirSync(outDir, { recursive: true });

let files = [];
try {
  files = fs.readdirSync(skillsDir).filter((f) => f.endsWith(".json"));
} catch (e) {
  files = [];
}

const skills = files
  .map((file) => {
    const raw = fs.readFileSync(path.join(skillsDir, file), "utf8");
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.warn(`[skills] Bỏ qua file lỗi định dạng: ${file}`);
      return null;
    }
    const workflowStatus = ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED"].includes(data.workflow?.status)
      ? data.workflow.status
      : "PUBLISHED";
    if (!includeUnpublished && workflowStatus !== "PUBLISHED") return null;
    const images = normalizeImages(data);
    const image = (images.find((item) => item.role === "cover") || images[0] || {}).src || "";
    const link = isSafeUrl(data.link) ? data.link : "";
    const bodyHtml = Array.isArray(data.bodyBlocks) ? renderBlocks(data.bodyBlocks) : markdownToHtml(typeof data.body === "string" ? data.body : "");
    if (!image && !link && !bodyHtml) {
      console.warn(`[skills] Bỏ qua "${file}": cần có ảnh, nội dung hoặc link.`);
      return null;
    }
    const slug = slugFromFilename(file);
    return {
      slug,
      title: typeof data.title === "string" ? data.title : "",
      image,
      images,
      summary: typeof data.summary === "string" ? data.summary : "",
      author: typeof data.author === "string" ? data.author : "",
      link,
      bodyHtml,
      date: typeof data.date === "string" ? data.date : "",
      category: typeof data.category === "string" ? data.category : "",
      series: typeof data.series === "string" ? data.series : "",
      order: data.order !== null && data.order !== "" && Number.isFinite(Number(data.order)) ? Number(data.order) : null,
      workflowStatus,
      pageUrl: !link ? `/ky-nang/${slug}/` : "",
    };
  })
  .filter(Boolean);

const payload = {
  generatedAt: new Date().toISOString(),
  skills,
};

fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
console.log(`[skills] Đã ghi ${skills.length} kỹ năng/infographic vào ${path.relative(process.cwd(), outFile)}`);
