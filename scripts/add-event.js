// CLI cuc bo de them 1 su kien vao content/events/ khi chua trien khai /admin (Decap CMS)
// tren Netlify. Sau khi trien khai, nen dung /admin de nhieu nguoi/tu xa cung quan tri duoc.
// Chi dung Node core (fs, path, readline, child_process) - khong can cai package.
"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("node:readline");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const eventsDir = path.join(root, "content", "events");
const uploadsDir = path.join(root, "uploads");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

function slugify(str) {
  let s = str.normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/đ/g, "d").replace(/Đ/g, "D");
  s = s.toLowerCase().trim();
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "su-kien";
}

function stripQuotes(p) {
  const t = p.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function todayIso() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// Hang doi dong nhap: khong dung rl.question() lien tiep vi neu nhieu dong
// den cung luc (dan nhieu dong, hoac input duoc pipe), cac dong den truoc khi
// question() ke tiep duoc goi se bi mat. Lang nghe 'line' lien tuc va xep
// hang la cach an toan bat ke toc do nhap.
function createLineReader() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const queue = [];
  const waiters = [];

  rl.on("line", (line) => {
    if (waiters.length) waiters.shift()(line);
    else queue.push(line);
  });

  function ask(promptText) {
    if (promptText) process.stdout.write(promptText);
    if (queue.length) return Promise.resolve(queue.shift());
    return new Promise((resolve) => waiters.push(resolve));
  }

  return { ask, close: () => rl.close() };
}

async function main() {
  const { ask, close } = createLineReader();

  console.log("=== Thêm sự kiện tuyên truyền An ninh mạng ===\n");

  let title = "";
  while (!title) {
    title = (await ask("Tiêu đề buổi tuyên truyền: ")).trim();
    if (!title) console.log("  -> Tiêu đề không được để trống.");
  }

  let date = "";
  const defaultDate = todayIso();
  while (!date) {
    const raw = (await ask(`Thời gian (YYYY-MM-DD) [${defaultDate}]: `)).trim();
    const candidate = raw || defaultDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
      date = candidate;
    } else {
      console.log("  -> Sai định dạng, nhập theo YYYY-MM-DD (vd: 2026-08-17).");
    }
  }

  let location = "";
  while (!location) {
    location = (await ask("Địa điểm: ")).trim();
    if (!location) console.log("  -> Địa điểm không được để trống.");
  }

  console.log(
    "Nội dung tóm tắt (hỗ trợ markdown: **đậm**, *nghiêng*, - danh sách, dòng trống ngăn đoạn văn)."
  );
  console.log('Nhập từng dòng, kết thúc bằng một dòng chỉ chứa dấu chấm "." rồi Enter:');
  const bodyLines = [];
  for (;;) {
    const line = await ask("");
    if (line.trim() === ".") break;
    bodyLines.push(line);
  }
  const body = bodyLines.join("\n").trim();

  console.log(
    "\nẢnh minh chứng: nhập đường dẫn file ảnh trên máy (jpg/png/gif/webp),"
  );
  const imagesRaw = (
    await ask("cách nhau bằng dấu phẩy, để trống nếu không có: ")
  ).trim();

  const images = [];
  if (imagesRaw) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    const parts = imagesRaw.split(",").map(stripQuotes).filter(Boolean);
    parts.forEach((srcPath, i) => {
      if (!fs.existsSync(srcPath) || !fs.statSync(srcPath).isFile()) {
        console.log(`  -> Bỏ qua (không tìm thấy file): ${srcPath}`);
        return;
      }
      const ext = path.extname(srcPath).toLowerCase();
      if (!IMAGE_EXT.has(ext)) {
        console.log(`  -> Bỏ qua (định dạng không hỗ trợ): ${srcPath}`);
        return;
      }
      const destName = `${date}-${slugify(title)}-${i + 1}${ext}`;
      fs.copyFileSync(srcPath, path.join(uploadsDir, destName));
      images.push(`/uploads/${destName}`);
      console.log(`  -> Đã sao chép: ${destName}`);
    });
  }

  let link = "";
  for (;;) {
    const raw = (await ask("Link bài viết tham khảo (để trống nếu không có): ")).trim();
    if (!raw || /^https?:\/\/.+/i.test(raw)) {
      link = raw;
      break;
    }
    console.log("  -> Link phải bắt đầu bằng http:// hoặc https://, hoặc để trống.");
  }

  close();

  fs.mkdirSync(eventsDir, { recursive: true });
  const baseSlug = `${date}-${slugify(title)}`;
  let slug = baseSlug;
  let n = 2;
  while (fs.existsSync(path.join(eventsDir, `${slug}.json`))) {
    slug = `${baseSlug}-${n++}`;
  }

  const data = { title, date, location, body, images, link };
  const filePath = path.join(eventsDir, `${slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  console.log(`\nĐã lưu: content/events/${slug}.json`);

  console.log("Đang cập nhật data/events.json...");
  execFileSync(process.execPath, [path.join(__dirname, "build-events.js")], {
    cwd: root,
    stdio: "inherit",
  });

  console.log("\nXong! Tải lại (F5) trang đang xem thử để thấy sự kiện mới.");
}

main().catch((err) => {
  console.error("Có lỗi xảy ra:", err.message);
  process.exit(1);
});
