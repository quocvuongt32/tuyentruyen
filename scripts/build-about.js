// Doc content/gioi-thieu.json (quan tri qua CMS) va ghi ra data/about.json
// cho trang tinh fetch(). Khong dung package ngoai — chi Node core (fs, path).
"use strict";

const fs = require("fs");
const path = require("path");

const srcFile = path.join(__dirname, "..", "content", "gioi-thieu.json");
const outDir = path.join(__dirname, "..", "data");
const outFile = path.join(outDir, "about.json");

const ICON_KEYS = new Set(["shield", "bulb", "refresh", "doc", "computer", "star"]);

function str(v, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function isSafeImagePath(src) {
  return typeof src === "string" && (src.startsWith("/") || src.startsWith("img/") || src.startsWith("uploads/"));
}

fs.mkdirSync(outDir, { recursive: true });

let raw;
try {
  raw = JSON.parse(fs.readFileSync(srcFile, "utf8"));
} catch (e) {
  console.warn(`[about] Không đọc được ${path.relative(process.cwd(), srcFile)}, dùng nội dung rỗng: ${e.message}`);
  raw = {};
}

const partners = (Array.isArray(raw.partners) ? raw.partners : [])
  .map((p) => ({
    icon: isSafeImagePath(p && p.icon) ? p.icon : "",
    text: str(p && p.text),
  }))
  .filter((p) => p.icon && p.text);

const points = (Array.isArray(raw.points) ? raw.points : [])
  .map((p) => ({
    icon: ICON_KEYS.has(p && p.icon) ? p.icon : "shield",
    text: str(p && p.text),
  }))
  .filter((p) => p.text);

const directives = (Array.isArray(raw.directives) ? raw.directives : [])
  .map((d) => ({
    title: str(d && d.title),
    date: str(d && d.date),
    description: str(d && d.description),
  }))
  .filter((d) => d.title || d.description);

const payload = {
  heading: str(raw.heading, "Giới thiệu"),
  intro: str(raw.intro),
  partners,
  points,
  directiveTitle: str(raw.directiveTitle, "Căn cứ thực hiện"),
  directives,
};

fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
console.log(`[about] Đã ghi nội dung Giới thiệu vào ${path.relative(process.cwd(), outFile)}`);
