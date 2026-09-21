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

["index.html", "_headers", "_redirects", "sitemap.xml", "css/article.css", "js/article.js"].forEach(requireFile);
["data/events.json", "data/ticker.json", "data/about.json", "data/site.json", "data/skills.json"].forEach(validateJson);
["README.md", "docs", "content", "scripts", "admin", "netlify.toml", "package.json", "wrangler.toml"].forEach(forbid);

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
for (const match of html.matchAll(/(?:src|href)="((?:css|js|img)\/[^"?#]+)"/g)) requireFile(match[1]);

const events = JSON.parse(fs.readFileSync(path.join(dist, "data/events.json"), "utf8")).events || [];
for (const event of events.filter((item) => item.slug && !item.slug.startsWith("feed-"))) {
  requireFile(path.join("hoat-dong", event.slug, "index.html"));
}
const skills = JSON.parse(fs.readFileSync(path.join(dist, "data/skills.json"), "utf8")).skills || [];
for (const skill of skills.filter((item) => item.slug && item.pageUrl)) {
  requireFile(path.join("ky-nang", skill.slug, "index.html"));
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
