"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const siteUrl = "https://tuyentruyen.khoaktt.vn";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function description(item) {
  const text = String(item.summary || stripHtml(item.bodyHtml) || item.title || "").trim();
  return text.length > 180 ? `${text.slice(0, 177).trim()}…` : text;
}

function absoluteAsset(src) {
  if (!src) return `${siteUrl}/img/og-image.jpg`;
  if (/^https?:\/\//i.test(src)) return src;
  return `${siteUrl}/${String(src).replace(/^\/+/, "")}`;
}

function formatDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return "";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function imageList(item) {
  const raw = Array.isArray(item.images) ? item.images : [];
  const list = raw
    .map((entry) => typeof entry === "string" ? entry : entry && (entry.src || entry.image))
    .filter(Boolean);
  if (item.image && !list.includes(item.image)) list.unshift(item.image);
  return list;
}

function renderGallery(item) {
  const images = imageList(item);
  if (!images.length) return "";
  const [cover, ...rest] = images;
  return `
    <figure class="article-cover"><img src="${escapeHtml(cover)}" alt="${escapeHtml(item.title)}" decoding="async"></figure>
    ${rest.length ? `<div class="article-gallery">${rest.map((src) => `<a href="${escapeHtml(src)}" target="_blank" rel="noopener"><img src="${escapeHtml(src)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async"></a>`).join("")}</div>` : ""}`;
}

function renderReferenceLinks(item) {
  const links = [];
  if (item.videoUrl) links.push(`<a class="article-reference" href="${escapeHtml(item.videoUrl)}" target="_blank" rel="noopener noreferrer">Xem video ↗</a>`);
  if (item.link) links.push(`<a class="article-reference" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Xem nguồn tham khảo ↗</a>`);
  return links.length ? `<div class="article-references">${links.join("")}</div>` : "";
}

function renderPage(item, kind, navigation = "") {
  const prefix = kind === "event" ? "hoat-dong" : "ky-nang";
  const label = kind === "event" ? "Hoạt động tuyên truyền" : "Bộ kỹ năng số";
  const canonical = `${siteUrl}/${prefix}/${encodeURIComponent(item.slug)}/`;
  const desc = description(item);
  const cover = absoluteAsset(imageList(item)[0]);
  const meta = [formatDate(item.date), item.categoryLabel || item.category, item.location].filter(Boolean);
  const body = item.bodyHtml || (item.summary ? `<p>${escapeHtml(item.summary)}</p>` : "");
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(item.title)} | Cẩm nang An toàn số</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="vi_VN">
  <meta property="og:site_name" content="Cẩm nang An toàn số">
  <meta property="og:title" content="${escapeHtml(item.title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${escapeHtml(cover)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(item.title)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <meta name="twitter:image" content="${escapeHtml(cover)}">
  <link rel="icon" href="/img/favicon.png">
  <link rel="stylesheet" href="/css/article.css">
</head>
<body>
  <header class="article-header">
    <a class="article-brand" href="/" aria-label="Về trang chủ">
      <img src="/img/logo-cong-an.png" alt="" width="54" height="54">
      <span><strong>CẨM NANG AN TOÀN SỐ</strong><small>Học viện Cảnh sát nhân dân</small></span>
    </a>
    <a class="back-home" href="/">← Trang chủ</a>
  </header>
  <main class="article-shell">
    <article class="article-card">
      <div class="article-kicker">${label}</div>
      <h1>${escapeHtml(item.title)}</h1>
      ${meta.length ? `<p class="article-meta">${meta.map(escapeHtml).join(" · ")}</p>` : ""}
      ${item.summary ? `<p class="article-lead">${escapeHtml(item.summary)}</p>` : ""}
      ${renderGallery(item)}
      <div class="article-content">${body}</div>
      ${renderReferenceLinks(item)}
      ${navigation}
      <div class="article-actions">
        <button type="button" id="copy-link" class="primary-action">Sao chép liên kết</button>
        <button type="button" id="share-link" class="secondary-action">Chia sẻ bài</button>
      </div>
      <p id="share-status" class="share-status" aria-live="polite"></p>
    </article>
  </main>
  <footer class="article-footer">Khoa Toán - Tin học và Ứng dụng KHCN · Học viện CSND</footer>
  <script src="/js/article.js" defer></script>
</body>
</html>`;
}

function writePage(prefix, item, navigation = "") {
  const dir = path.join(dist, prefix, item.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), renderPage(item, prefix === "hoat-dong" ? "event" : "skill", navigation), "utf8");
}

const eventsPayload = JSON.parse(fs.readFileSync(path.join(dist, "data", "events.json"), "utf8"));
const skillsPayload = JSON.parse(fs.readFileSync(path.join(dist, "data", "skills.json"), "utf8"));
const events = (eventsPayload.events || []).filter((item) => item.slug && !item.slug.startsWith("feed-"));
const skills = (skillsPayload.skills || []).filter((item) => item.slug && item.pageUrl);

events.forEach((item) => writePage("hoat-dong", item));

const seriesGroups = new Map();
skills.forEach((item) => {
  if (!item.series) return;
  if (!seriesGroups.has(item.series)) seriesGroups.set(item.series, []);
  seriesGroups.get(item.series).push(item);
});
seriesGroups.forEach((items) => items.sort((a, b) => (a.order || 9999) - (b.order || 9999)));

skills.forEach((item) => {
  let navigation = "";
  const group = item.series ? seriesGroups.get(item.series) || [] : [];
  const index = group.findIndex((entry) => entry.slug === item.slug);
  if (group.length > 1) {
    const prev = index > 0 ? group[index - 1] : null;
    const next = index >= 0 && index < group.length - 1 ? group[index + 1] : null;
    navigation = `<nav class="series-nav" aria-label="Bài trong chuỗi"><div><small>Chuỗi kỹ năng</small><strong>${escapeHtml(item.series)}</strong></div>${prev ? `<a href="/ky-nang/${prev.slug}/">← ${escapeHtml(prev.title)}</a>` : ""}${next ? `<a href="/ky-nang/${next.slug}/">${escapeHtml(next.title)} →</a>` : ""}</nav>`;
  }
  writePage("ky-nang", item, navigation);
});

const urls = [
  `${siteUrl}/`,
  ...events.map((item) => `${siteUrl}/hoat-dong/${encodeURIComponent(item.slug)}/`),
  ...skills.map((item) => `${siteUrl}/ky-nang/${encodeURIComponent(item.slug)}/`),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemap, "utf8");

console.log(`Đã tạo ${events.length} trang hoạt động, ${skills.length} trang kỹ năng và sitemap.xml.`);
