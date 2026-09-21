"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const uiDir = path.join(root, "tools", "publisher");
const distDir = path.join(root, "dist");
const host = "127.0.0.1";
const siteUrl = "https://tuyentruyen.khoaktt.vn";
const token = crypto.randomBytes(24).toString("hex");
const maxRequestBytes = 45 * 1024 * 1024;
const maxImageBytes = 2_500_000;
const maxImages = 15;
const categories = new Set(["an-ninh-mang", "chuyen-doi-so", "doi-moi-sang-tao", "nghien-cuu-khoa-hoc", "khac"]);
let pending = null;

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendFile(res, file) {
  const ext = path.extname(file).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Không tìm thấy tệp.");
    return;
  }
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
}

function safeJoin(base, requestPath) {
  const decoded = decodeURIComponent(requestPath).replace(/^\/+/, "");
  const target = path.resolve(base, decoded);
  const baseResolved = path.resolve(base) + path.sep;
  return target.startsWith(baseResolved) ? target : null;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxRequestBytes) {
        reject(new Error("Dữ liệu quá lớn. Hãy giảm số lượng hoặc dung lượng ảnh."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        reject(new Error("Dữ liệu gửi lên không hợp lệ."));
      }
    });
    req.on("error", reject);
  });
}

function assertToken(req) {
  if (req.headers["x-publisher-token"] !== token) throw new Error("Phiên đăng bài không hợp lệ. Hãy đóng và mở lại Dang-bai.bat.");
  const origin = req.headers.origin;
  if (origin && !origin.startsWith(`http://${host}:`)) throw new Error("Yêu cầu không đến từ giao diện cục bộ.");
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function cleanText(value, max, field, required = false) {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  if (required && !text) throw new Error(`Thiếu ${field}.`);
  if (text.length > max) throw new Error(`${field} dài quá giới hạn ${max} ký tự.`);
  return text;
}

function cleanUrl(value, field) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    if (!/^https?:$/.test(url.protocol)) throw new Error();
    return url.href;
  } catch (error) {
    throw new Error(`${field} phải bắt đầu bằng http:// hoặc https://.`);
  }
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset++; continue; }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) return null;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  return null;
}

function decodeImage(item, index) {
  const match = String(item && item.dataUrl || "").match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error(`Ảnh số ${index + 1} chưa được chuẩn hóa thành JPEG.`);
  const buffer = Buffer.from(match[1], "base64");
  if (!buffer.length || buffer.length > maxImageBytes) throw new Error(`Ảnh số ${index + 1} vượt quá 2,5 MB sau tối ưu.`);
  const dimensions = jpegDimensions(buffer);
  if (!dimensions) throw new Error(`Ảnh số ${index + 1} bị lỗi hoặc không phải JPEG hợp lệ.`);
  if (dimensions.width < 320 || dimensions.height < 320) throw new Error(`Ảnh số ${index + 1} quá nhỏ; mỗi chiều cần ít nhất 320 px.`);
  if (dimensions.width > 2200 || dimensions.height > 2200) throw new Error(`Ảnh số ${index + 1} chưa được thu nhỏ đúng giới hạn.`);
  return { buffer, dimensions };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", windowsHide: true, ...options });
  if (result.error) throw result.error;
  return result;
}

function buildAndCheck() {
  const build = run(process.execPath, [path.join(root, "scripts", "build-public.js")]);
  if (build.status !== 0) throw new Error(`Build thất bại:\n${build.stderr || build.stdout}`);
  const check = run(process.execPath, [path.join(root, "scripts", "check-site.js")]);
  if (check.status !== 0) throw new Error(`Kiểm tra website thất bại:\n${check.stderr || check.stdout}`);
  return `${build.stdout}\n${check.stdout}`.trim();
}

function uniqueSlug(type, preferred) {
  const dir = type === "event" ? path.join(root, "content", "events") : path.join(root, "content", "ky-nang");
  let slug = preferred;
  let n = 2;
  while (fs.existsSync(path.join(dir, `${slug}.json`))) slug = `${preferred}-${n++}`;
  return slug;
}

function createPost(input) {
  if (pending) throw new Error("Đang có một bài đã lưu chờ đăng. Hãy đăng hoặc hủy bài đó trước.");
  const type = input.type === "skill" ? "skill" : input.type === "event" ? "event" : "";
  if (!type) throw new Error("Loại bài không hợp lệ.");
  const title = cleanText(input.title, 180, "tiêu đề", true);
  const summary = cleanText(input.summary, 320, "tóm tắt", true);
  const body = cleanText(input.body, 30_000, "nội dung", true);
  if (body.length < 30) throw new Error("Nội dung cần ít nhất 30 ký tự.");
  const date = cleanText(input.date, 10, "ngày đăng", true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Ngày đăng phải theo định dạng YYYY-MM-DD.");
  const placement = type === "event" && input.placement === "activity" ? "activity" : "timeline";
  let category = categories.has(input.category) ? input.category : "khac";
  if (type === "event" && placement === "timeline") category = "an-ninh-mang";
  const preferred = slugify(input.slug || title);
  if (!preferred) throw new Error("Không tạo được đường dẫn từ tiêu đề.");
  const slug = uniqueSlug(type, preferred);
  const images = Array.isArray(input.images) ? input.images : [];
  if (!images.length) throw new Error("Cần chọn ít nhất một ảnh đại diện.");
  if (images.length > maxImages) throw new Error(`Mỗi bài tối đa ${maxImages} ảnh.`);
  const decodedImages = images.map(decodeImage);
  const created = [];
  const contentDir = type === "event" ? path.join(root, "content", "events") : path.join(root, "content", "ky-nang");
  fs.mkdirSync(contentDir, { recursive: true });
  fs.mkdirSync(path.join(root, "uploads"), { recursive: true });

  try {
    const imagePaths = decodedImages.map((image, index) => {
      const name = `${date}-${slug}-${String(index + 1).padStart(2, "0")}.jpg`;
      const rel = path.join("uploads", name);
      const absolute = path.join(root, rel);
      fs.writeFileSync(absolute, image.buffer, { flag: "wx" });
      created.push(absolute);
      return `/${rel.replace(/\\/g, "/")}`;
    });

    let data;
    if (type === "event") {
      data = {
        title,
        summary,
        category,
        placement,
        date,
        location: cleanText(input.location, 220, "địa điểm"),
        body,
        images: imagePaths.map((image, index) => ({ image, featured: index === 0 && input.featuredBanner === true })),
        link: cleanUrl(input.link, "Link tham khảo"),
        video: cleanUrl(input.video, "Link video"),
      };
    } else {
      const orderRaw = Number(input.order);
      data = {
        title,
        summary,
        date,
        category,
        series: cleanText(input.series, 160, "tên chuỗi"),
        order: Number.isInteger(orderRaw) && orderRaw > 0 ? orderRaw : null,
        body,
        image: imagePaths[0],
        images: imagePaths.map((image) => ({ image })),
        link: "",
      };
    }

    const contentRel = path.join("content", type === "event" ? "events" : "ky-nang", `${slug}.json`);
    const contentAbs = path.join(root, contentRel);
    fs.writeFileSync(contentAbs, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    created.push(contentAbs);
    const log = buildAndCheck();
    const prefix = type === "event" ? "hoat-dong" : "ky-nang";
    pending = {
      type,
      title,
      slug,
      paths: [contentRel, ...imagePaths.map((value) => value.replace(/^\//, "").replace(/\//g, path.sep))],
      url: `${siteUrl}/${prefix}/${slug}/`,
      previewUrl: `/preview/${prefix}/${slug}/`,
      committed: false,
    };
    return { ...pending, log };
  } catch (error) {
    created.reverse().forEach((file) => { try { fs.rmSync(file, { force: true }); } catch (_) {} });
    try { buildAndCheck(); } catch (_) {}
    throw error;
  }
}

function gitOutput(args) {
  const result = run("git", args);
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || "Lệnh Git thất bại.").trim());
  return result.stdout.trim();
}

function publishPending() {
  if (!pending) throw new Error("Chưa có bài nào đã lưu và kiểm tra để đăng.");
  const branch = gitOutput(["branch", "--show-current"]);
  if (branch !== "main") throw new Error(`Đang ở nhánh ${branch || "không xác định"}; chỉ cho phép đăng từ nhánh main.`);

  if (!pending.committed) {
    const ahead = Number(gitOutput(["rev-list", "--count", "@{upstream}..HEAD"]) || "0");
    if (ahead > 0) throw new Error(`Đang có ${ahead} commit cũ chưa đẩy lên GitHub. Hãy xử lý các commit đó trước để trình đăng bài không đẩy kèm thay đổi ngoài ý muốn.`);
    const stagedBefore = gitOutput(["diff", "--cached", "--name-only"]);
    if (stagedBefore) throw new Error("Git đang có tệp được stage từ trước. Hãy commit hoặc bỏ stage các tệp đó rồi thử lại để tránh đăng nhầm.");
    gitOutput(["add", "--", ...pending.paths]);
    const staged = gitOutput(["diff", "--cached", "--name-only"]).split(/\r?\n/).filter(Boolean);
    const allowed = new Set(pending.paths.map((item) => item.replace(/\\/g, "/")));
    const unexpected = staged.filter((item) => !allowed.has(item.replace(/\\/g, "/")));
    if (unexpected.length) throw new Error(`Phát hiện tệp ngoài bài đăng trong vùng stage: ${unexpected.join(", ")}`);
    const commit = run("git", ["commit", "-m", `Đăng bài: ${pending.title}`]);
    if (commit.status !== 0) throw new Error((commit.stderr || commit.stdout || "Không tạo được commit.").trim());
    pending.committed = true;
  }

  const push = run("git", ["push", "origin", "main"]);
  if (push.status !== 0) throw new Error(`Đã tạo commit nhưng chưa đẩy được lên GitHub:\n${push.stderr || push.stdout}\nBạn có thể bấm Đăng lại sau khi xử lý kết nối.`);
  const result = { url: pending.url, title: pending.title, slug: pending.slug };
  pending = null;
  return result;
}

function discardPending() {
  if (!pending) return;
  if (pending.committed) throw new Error("Bài đã được commit nên không thể hủy tự động. Hãy đẩy lại lên GitHub hoặc xử lý bằng Git.");
  pending.paths.forEach((rel) => fs.rmSync(path.join(root, rel), { force: true }));
  pending = null;
  buildAndCheck();
}

async function route(req, res) {
  const requestUrl = new URL(req.url, `http://${host}`);
  try {
    if (requestUrl.pathname === "/api/config" && req.method === "GET") {
      sendJson(res, 200, { token, siteUrl, pending, maxImages, maxImageBytes });
      return;
    }
    if (requestUrl.pathname === "/api/create" && req.method === "POST") {
      assertToken(req);
      const input = await readJson(req);
      sendJson(res, 200, { ok: true, post: createPost(input) });
      return;
    }
    if (requestUrl.pathname === "/api/publish" && req.method === "POST") {
      assertToken(req);
      sendJson(res, 200, { ok: true, post: publishPending() });
      return;
    }
    if (requestUrl.pathname === "/api/discard" && req.method === "POST") {
      assertToken(req);
      discardPending();
      sendJson(res, 200, { ok: true });
      return;
    }
    if (requestUrl.pathname === "/api/check-live" && req.method === "GET") {
      const target = requestUrl.searchParams.get("url") || "";
      if (!target.startsWith(`${siteUrl}/`)) throw new Error("URL kiểm tra không hợp lệ.");
      try {
        const response = await fetch(`${target}${target.includes("?") ? "&" : "?"}t=${Date.now()}`, { redirect: "follow" });
        sendJson(res, 200, { live: response.ok, status: response.status });
      } catch (error) {
        sendJson(res, 200, { live: false, status: 0 });
      }
      return;
    }

    if (requestUrl.pathname.startsWith("/preview/")) {
      let rel = requestUrl.pathname.slice("/preview/".length);
      if (!path.extname(rel)) rel = path.join(rel, "index.html");
      const file = safeJoin(distDir, rel);
      if (!file) throw new Error("Đường dẫn xem trước không hợp lệ.");
      sendFile(res, file);
      return;
    }
    if (/^\/(css|js|img|uploads|data)\//.test(requestUrl.pathname)) {
      const file = safeJoin(distDir, requestUrl.pathname);
      if (!file) throw new Error("Đường dẫn tài sản không hợp lệ.");
      sendFile(res, file);
      return;
    }

    const uiPath = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname;
    const file = safeJoin(uiDir, uiPath);
    if (!file) throw new Error("Đường dẫn giao diện không hợp lệ.");
    sendFile(res, file);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || "Có lỗi không xác định." });
  }
}

function openBrowser(url) {
  if (process.platform === "win32") spawn("cmd.exe", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

const server = http.createServer(route);
server.listen(0, host, () => {
  const address = server.address();
  const url = `http://${host}:${address.port}/`;
  console.log("============================================================");
  console.log("  TRÌNH ĐĂNG BÀI — CẨM NANG AN TOÀN SỐ");
  console.log("============================================================");
  console.log(`Đang chạy tại: ${url}`);
  console.log("Chỉ truy cập từ máy này. Đóng cửa sổ này để tắt trình đăng bài.");
  openBrowser(url);
});

server.on("error", (error) => {
  console.error("Không thể khởi động trình đăng bài:", error.message);
  process.exitCode = 1;
});
