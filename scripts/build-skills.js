// Gộp content/ky-nang/*.json (Bộ kỹ năng An toàn số — ảnh/infographic về thủ đoạn
// lừa đảo và cách phòng ngừa) thành data/skills.json để trang tĩnh fetch().
// Không dùng package ngoài — chỉ Node core (fs, path).
"use strict";

const fs = require("fs");
const path = require("path");

const skillsDir = path.join(__dirname, "..", "content", "ky-nang");
const outDir = path.join(__dirname, "..", "data");
const outFile = path.join(outDir, "skills.json");

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
    const image = isSafeImagePath(data.image) ? data.image : "";
    const link = isSafeUrl(data.link) ? data.link : "";
    if (!image && !link) {
      console.warn(`[skills] Bỏ qua "${file}": cần có ảnh hoặc link, không có cả 2.`);
      return null;
    }
    return {
      slug: slugFromFilename(file),
      title: typeof data.title === "string" ? data.title : "",
      image,
      summary: typeof data.summary === "string" ? data.summary : "",
      link,
    };
  })
  .filter(Boolean);

const payload = {
  generatedAt: new Date().toISOString(),
  skills,
};

fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
console.log(`[skills] Đã ghi ${skills.length} kỹ năng/infographic vào ${path.relative(process.cwd(), outFile)}`);
