"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const errors = [];

function requireFile(rel) {
  if (!fs.existsSync(path.join(dist, rel))) errors.push(`Thiếu file public: ${rel}`);
}

function forbid(rel) {
  if (fs.existsSync(path.join(dist, rel))) errors.push(`File nội bộ lọt vào dist: ${rel}`);
}

function validateJson(rel) {
  requireFile(rel);
  try {
    JSON.parse(fs.readFileSync(path.join(dist, rel), "utf8"));
  } catch (error) {
    errors.push(`JSON không hợp lệ: ${rel} (${error.message})`);
  }
}

["index.html", "_headers", "_redirects", "sitemap.xml", "css/article.css", "js/article.js", "privacy/index.html", "terms/index.html", "nguon-tin/index.html", "contact/index.html"].forEach(requireFile);
["data/events.json", "data/ticker.json", "data/about.json", "data/site.json", "data/skills.json"].forEach(validateJson);
["README.md", "CHANGES.md", "DEPLOY_CHECKLIST.md", "docs", "content", "scripts", "admin", "netlify.toml", "package.json", "wrangler.toml"].forEach(forbid);

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
for (const match of html.matchAll(/(?:src|href)="((?:css|js|img)\/[^"?#]+)"/g)) requireFile(match[1]);
if (/newsletter|api\/newsletter|web3forms|type="email"/i.test(html)) errors.push("Trang chủ vẫn còn chức năng hoặc trường thu thập email.");
if (!html.includes("KHOA TOÁN - TIN HỌC VÀ ỨNG DỤNG KHCN TRONG PCTP")) errors.push("Footer trang chủ chưa đúng tên đơn vị.");
if (!html.includes("Tổng hợp tin tức hàng ngày")) errors.push("Khối tin hằng ngày chưa dùng đúng tiêu đề.");
if (/quick-stats-wrap|Báo điện tử Chính phủ/i.test(html)) errors.push("Khối tin hằng ngày vẫn còn nội dung cũ.");
if (!html.includes("sản phẩm dự thi Cuộc thi")) errors.push("Footer chưa nêu trạng thái sản phẩm dự thi.");

const events = JSON.parse(fs.readFileSync(path.join(dist, "data/events.json"), "utf8")).events || [];
for (const category of ["chuyen-doi-so", "doi-moi-sang-tao", "nghien-cuu-khoa-hoc"]) {
  const items = events.filter((item) => item.category === category);
  if (items.length < 4 || items.length > 6) errors.push(`Chuyên mục ${category} phải có từ 4 đến 6 tin (hiện có ${items.length}).`);
  for (const item of items) {
    if (!item.summary || !item.source || !item.link || !item.externalSource) {
      errors.push(`Tin nguồn ngoài chưa đủ tóm tắt/trích nguồn: ${item.slug || item.title}`);
    }
  }
}
for (const event of events.filter((item) => item.slug && !item.slug.startsWith("feed-") && !item.externalSource)) {
  requireFile(path.join("hoat-dong", event.slug, "index.html"));
}
const skills = JSON.parse(fs.readFileSync(path.join(dist, "data/skills.json"), "utf8")).skills || [];
for (const skill of skills.filter((item) => item.slug && item.pageUrl)) {
  requireFile(path.join("ky-nang", skill.slug, "index.html"));
}

const samplePage = [...events.filter((item) => item.slug && !item.slug.startsWith("feed-") && !item.externalSource), ...skills.filter((item) => item.slug && item.pageUrl)][0];
if (samplePage) {
  const prefix = events.includes(samplePage) ? "hoat-dong" : "ky-nang";
  const pageHtml = fs.readFileSync(path.join(dist, prefix, samplePage.slug, "index.html"), "utf8");
  if (!pageHtml.includes('/img/badge.png')) errors.push("Trang bài riêng chưa dùng logo Cẩm nang An toàn số.");
  if (!pageHtml.includes("Của Khoa KTT, Học viện CSND")) errors.push("Trang bài riêng chưa ghi rõ Cẩm nang của Khoa KTT, Học viện CSND.");
  if (!pageHtml.includes("KHOA TOÁN - TIN HỌC VÀ ỨNG DỤNG KHCN TRONG PCTP")) errors.push("Footer trang bài riêng chưa đúng tên đơn vị.");
}

for (const payload of [events, skills]) {
  for (const item of payload) {
    const refs = [];
    if (item.image) refs.push(item.image);
    if (Array.isArray(item.images)) {
      item.images.forEach((entry) => refs.push(typeof entry === "string" ? entry : entry && (entry.src || entry.image)));
    }
    refs.filter((src) => typeof src === "string" && /^\/?uploads\//.test(src)).forEach((src) => requireFile(src.replace(/^\//, "")));
  }
}

if (errors.length) {
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Kiểm tra dist thành công: đủ dữ liệu, đủ tài sản và không lộ file nội bộ.");
