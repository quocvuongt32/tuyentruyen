"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");
const { createAuthStore } = require("./lib/publisher-auth");
const { normalizeBlocks, plainTextFromBlocks } = require("./lib/rich-content");

const root = path.join(__dirname, "..");
const uiDir = path.join(root, "tools", "publisher");
const distDir = path.join(root, "dist");
const host = "127.0.0.1";
const siteUrl = "https://tuyentruyen.khoaktt.vn";
const maxImages = 30;
const authStore = createAuthStore(root, process.env.PUBLISHER_STATE_DIR || "");
const pendingPath = path.join(authStore.stateDir, "pending.json");
const sessions = new Map();
const loginAttempts = new Map();
const sessionMaxAgeMs = 8 * 60 * 60 * 1000;
const permissions = {
  admin: new Set(["create", "submit", "approve", "publish", "discard", "manage-users"]),
  author: new Set(["create", "submit", "discard"]),
  approver: new Set(["approve", "publish"]),
};

function envNumber(name, fallback, min, max) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

const imageOptimization = Object.freeze({
  maxEdge: Math.round(envNumber("PUBLISHER_IMAGE_MAX_EDGE", 1920, 1280, 2560)),
  targetBytes: Math.round(envNumber("PUBLISHER_IMAGE_TARGET_BYTES", 1_400_000, 500_000, 2_300_000)),
  maxBytes: Math.round(envNumber("PUBLISHER_IMAGE_MAX_BYTES", 2_500_000, 1_000_000, 5_000_000)),
  minQuality: envNumber("PUBLISHER_IMAGE_MIN_QUALITY", 0.72, 0.6, 0.9),
  maxQuality: envNumber("PUBLISHER_IMAGE_MAX_QUALITY", 0.9, 0.75, 0.98),
  maxSourceBytes: Math.round(envNumber("PUBLISHER_IMAGE_MAX_SOURCE_BYTES", 250 * 1024 * 1024, 30 * 1024 * 1024, 500 * 1024 * 1024)),
});
const maxImageBytes = imageOptimization.maxBytes;
// Base64 lon hon tep nhi phan khoang 1/3; chua them du dia cho noi dung bai.
const maxRequestBytes = Math.max(45 * 1024 * 1024, Math.ceil(maxImages * maxImageBytes * 4 / 3) + 2 * 1024 * 1024);
const categories = new Set(["an-ninh-mang", "chuyen-doi-so", "doi-moi-sang-tao", "nghien-cuu-khoa-hoc", "khac"]);
let pending = null;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function loadPending() {
  try {
    const value = JSON.parse(fs.readFileSync(pendingPath, "utf8"));
    if (!value || !Array.isArray(value.paths) || !value.paths.length) return null;
    if (!fs.existsSync(path.join(root, value.paths[0]))) return null;
    return value;
  } catch (_) {
    return null;
  }
}

function savePending() {
  fs.mkdirSync(authStore.stateDir, { recursive: true });
  if (!pending) {
    fs.rmSync(pendingPath, { force: true });
    return;
  }
  fs.writeFileSync(pendingPath, `${JSON.stringify(pending, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map((item) => item.trim()).filter(Boolean).map((item) => {
    const index = item.indexOf("=");
    return index < 0 ? [item, ""] : [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
  }));
}

function sessionFor(req) {
  const id = parseCookies(req).publisher_session;
  const session = id && sessions.get(id);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(id);
    return null;
  }
  session.expiresAt = Date.now() + sessionMaxAgeMs;
  return session;
}

function requireSession(req) {
  const session = sessionFor(req);
  if (!session) throw new HttpError(401, "Bạn cần đăng nhập lại.");
  return session;
}

function requirePermission(session, permission) {
  if (!permissions[session.user.role]?.has(permission)) throw new HttpError(403, "Tài khoản không có quyền thực hiện thao tác này.");
}

function assertCsrf(req, session) {
  if (req.headers["x-publisher-token"] !== session.csrfToken) throw new HttpError(403, "Phiên làm việc không hợp lệ. Hãy tải lại trang.");
  const origin = req.headers.origin;
  if (origin && !origin.startsWith(`http://${host}:`)) throw new HttpError(403, "Yêu cầu không đến từ giao diện cục bộ.");
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, "Cache-Control": "no-store" });
  res.end();
}

function sendJson(res, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...extraHeaders,
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
  res.writeHead(200, {
    "Content-Type": types[ext] || "application/octet-stream",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; frame-src https://www.youtube-nocookie.com; img-src 'self' data: blob:; media-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
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

function publicPending(value) {
  if (!value) return null;
  const { paths, ...safe } = value;
  return safe;
}

function sessionPayload(session) {
  const rolePermissions = permissions[session.user.role] || new Set();
  return {
    user: session.user,
    csrfToken: session.csrfToken,
    permissions: [...rolePermissions],
  };
}

function invalidateUserSessions(username, exceptId = "") {
  for (const [id, session] of sessions) {
    if (id !== exceptId && session.user.username === username) sessions.delete(id);
  }
}

function loginKey(req, username) {
  return `${req.socket.remoteAddress || host}:${String(username || "").trim().toLowerCase()}`;
}

function checkLoginRate(req, username) {
  const key = loginKey(req, username);
  const cutoff = Date.now() - 15 * 60 * 1000;
  const attempts = (loginAttempts.get(key) || []).filter((time) => time > cutoff);
  loginAttempts.set(key, attempts);
  if (attempts.length >= 5) throw new HttpError(429, "Đăng nhập sai quá nhiều lần. Hãy chờ 15 phút rồi thử lại.");
  return key;
}

function login(req, res, input) {
  const username = String(input.username || "").trim().toLowerCase();
  const key = checkLoginRate(req, username);
  const user = authStore.verify(username, input.password);
  if (!user) {
    loginAttempts.set(key, [...(loginAttempts.get(key) || []), Date.now()]);
    throw new HttpError(401, "Tên đăng nhập hoặc mật khẩu không đúng.");
  }
  loginAttempts.delete(key);
  const id = crypto.randomBytes(32).toString("hex");
  const session = {
    id,
    user,
    csrfToken: crypto.randomBytes(24).toString("hex"),
    expiresAt: Date.now() + sessionMaxAgeMs,
  };
  sessions.set(id, session);
  sendJson(res, 200, { ok: true, ...sessionPayload(session) }, {
    "Set-Cookie": `publisher_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(sessionMaxAgeMs / 1000)}`,
  });
}

function logout(req, res) {
  const id = parseCookies(req).publisher_session;
  if (id) sessions.delete(id);
  sendJson(res, 200, { ok: true }, { "Set-Cookie": "publisher_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
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

function buildAndCheck({ includeUnpublished = false } = {}) {
  const env = { ...process.env };
  if (includeUnpublished) env.INCLUDE_UNPUBLISHED = "1";
  else delete env.INCLUDE_UNPUBLISHED;
  const build = run(process.execPath, [path.join(root, "scripts", "build-public.js")], { env });
  if (build.status !== 0) throw new Error(`Build thất bại:\n${build.stderr || build.stdout}`);
  const check = run(process.execPath, [path.join(root, "scripts", "check-site.js")], { env });
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

function createPost(input, actor) {
  if (pending) throw new Error("Đang có một bài đã lưu chờ đăng. Hãy đăng hoặc hủy bài đó trước.");
  const type = input.type === "skill" ? "skill" : input.type === "event" ? "event" : "";
  if (!type) throw new Error("Loại bài không hợp lệ.");
  const title = cleanText(input.title, 180, "tiêu đề", true);
  const author = cleanText(actor.fullName, 160, "người tạo bài", true);
  const summary = cleanText(input.summary, 320, "tóm tắt", true);
  const rawBlocks = Array.isArray(input.bodyBlocks) ? input.bodyBlocks : [];
  const body = cleanText(plainTextFromBlocks(rawBlocks), 30_000, "nội dung", true);
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
  const imageIds = new Set();
  const decodedImages = images.map((item, index) => {
    const id = /^img-[a-zA-Z0-9-]{8,80}$/.test(String(item && item.id || "")) ? item.id : `img-legacy-${index + 1}`;
    if (imageIds.has(id)) throw new Error("Danh sách ảnh có mã bị trùng.");
    imageIds.add(id);
    const kind = ["cover", "gallery", "inline"].includes(item && item.kind) ? item.kind : index === 0 ? "cover" : "gallery";
    return { id, kind, caption: cleanText(item && item.caption, 260, "chú thích ảnh"), ...decodeImage(item, index) };
  });
  if (!decodedImages.some((item) => item.kind === "cover")) {
    const fallbackCover = decodedImages.find((item) => item.kind !== "inline");
    if (fallbackCover) fallbackCover.kind = "cover";
  }
  if (!decodedImages.some((item) => item.kind === "cover")) throw new Error("Cần chọn một ảnh đại diện cho bài.");
  let coverSeen = false;
  decodedImages.forEach((item) => {
    if (item.kind !== "cover") return;
    if (!coverSeen) coverSeen = true;
    else item.kind = "gallery";
  });
  const referenceLink = type === "event" ? cleanUrl(input.link, "Link tham khảo") : "";
  const videoLink = type === "event" ? cleanUrl(input.video, "Link video") : "";
  const now = new Date().toISOString();
  const workflow = {
    status: "DRAFT",
    createdBy: author,
    createdUsername: actor.username,
    reviewedBy: "",
    updatedBy: author,
    approvedBy: "",
    publishedBy: "",
    createdAt: now,
    reviewedAt: "",
    approvedAt: "",
    publishedAt: "",
    revisionHistory: [{ status: "DRAFT", actor: author, at: now, note: "Tạo bản nháp" }],
    references: [...new Set([referenceLink, videoLink].filter(Boolean))],
  };
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
      return { id: image.id, kind: image.kind, caption: image.caption, path: `/${rel.replace(/\\/g, "/")}` };
    });
    const imagePathById = new Map(imagePaths.map((item) => [item.id, item.path]));
    const bodyBlocks = normalizeBlocks(rawBlocks, (id) => imagePathById.get(id) || "");
    const publicImages = imagePaths.filter((item) => item.kind !== "inline");
    const coverImage = publicImages.find((item) => item.kind === "cover");

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
        bodyBlocks,
        author,
        images: publicImages.map((item) => ({ image: item.path, role: item.kind, caption: item.caption, featured: item.kind === "cover" && input.featuredBanner === true })),
        link: referenceLink,
        video: videoLink,
        workflow,
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
        bodyBlocks,
        author,
        image: coverImage.path,
        images: publicImages.map((item) => ({ image: item.path, role: item.kind, caption: item.caption })),
        link: "",
        workflow,
      };
    }

    const contentRel = path.join("content", type === "event" ? "events" : "ky-nang", `${slug}.json`);
    const contentAbs = path.join(root, contentRel);
    fs.writeFileSync(contentAbs, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    created.push(contentAbs);
    const log = buildAndCheck({ includeUnpublished: true });
    const prefix = type === "event" ? "hoat-dong" : "ky-nang";
    pending = {
      type,
      title,
      slug,
      paths: [contentRel, ...imagePaths.map((item) => item.path.replace(/^\//, "").replace(/\//g, path.sep))],
      url: `${siteUrl}/${prefix}/${slug}/`,
      previewUrl: `/preview/${prefix}/${slug}/`,
      committed: false,
      workflowStatus: "DRAFT",
      createdBy: author,
      createdUsername: actor.username,
      reviewedBy: "",
      approvedBy: "",
      publishedBy: "",
    };
    savePending();
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

function pendingContentPath() {
  if (!pending) throw new Error("Chưa có bài nào đang xử lý.");
  return path.join(root, pending.paths[0]);
}

function updatePendingWorkflow(nextStatus, actor, note) {
  const contentPath = pendingContentPath();
  const data = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  const workflow = data.workflow || {};
  const current = workflow.status || "DRAFT";
  const allowed = { DRAFT: "REVIEW", REVIEW: "APPROVED", APPROVED: "PUBLISHED" };
  if (allowed[current] !== nextStatus) throw new Error(`Không thể chuyển trạng thái ${current} → ${nextStatus}.`);
  const cleanActor = cleanText(actor && actor.fullName, 160, "người thực hiện", true);
  const actorUsername = cleanText(actor && actor.username, 80, "tài khoản thực hiện", true).toLowerCase();
  const sameCreator = actorUsername === String(workflow.createdUsername || pending.createdUsername || "").toLowerCase();
  if (["APPROVED", "PUBLISHED"].includes(nextStatus) && sameCreator && actor.role !== "admin") {
    throw new Error("Người tạo bài không được tự phê duyệt hoặc tự xuất bản bài.");
  }

  const now = new Date().toISOString();
  workflow.status = nextStatus;
  workflow.updatedBy = cleanActor;
  workflow.revisionHistory = Array.isArray(workflow.revisionHistory) ? workflow.revisionHistory : [];
  workflow.revisionHistory.push({ status: nextStatus, actor: cleanActor, username: actorUsername, at: now, note });
  if (nextStatus === "REVIEW") {
    workflow.reviewedBy = cleanActor;
    workflow.reviewedUsername = actorUsername;
    workflow.reviewedAt = now;
  }
  if (nextStatus === "APPROVED") {
    workflow.approvedBy = cleanActor;
    workflow.approvedUsername = actorUsername;
    workflow.approvedAt = now;
  }
  if (nextStatus === "PUBLISHED") {
    if (!workflow.approvedBy || !workflow.approvedAt) throw new Error("Bài chưa có thông tin phê duyệt hợp lệ.");
    workflow.publishedBy = cleanActor;
    workflow.publishedUsername = actorUsername;
    workflow.publishedAt = now;
  }
  data.workflow = workflow;
  fs.writeFileSync(contentPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  pending.workflowStatus = nextStatus;
  pending.updatedBy = cleanActor;
  pending.reviewedBy = workflow.reviewedBy || "";
  pending.approvedBy = workflow.approvedBy || "";
  pending.publishedBy = workflow.publishedBy || "";
  savePending();
  return data;
}

function submitPendingReview(actor) {
  if (!pending) throw new Error("Chưa có bản nháp để gửi duyệt.");
  return transitionPendingWorkflow("REVIEW", actor, "Biên tập, rà soát và gửi bài để phê duyệt");
}

function approvePending(actor) {
  if (!pending) throw new Error("Chưa có bài đang chờ duyệt.");
  return transitionPendingWorkflow("APPROVED", actor, "Phê duyệt nội dung để xuất bản");
}

function transitionPendingWorkflow(nextStatus, actor, note) {
  const contentPath = pendingContentPath();
  const originalContent = fs.readFileSync(contentPath, "utf8");
  const originalPending = { ...pending };
  try {
    updatePendingWorkflow(nextStatus, actor, note);
    buildAndCheck({ includeUnpublished: true });
    return pending;
  } catch (error) {
    fs.writeFileSync(contentPath, originalContent, "utf8");
    pending = originalPending;
    savePending();
    try { buildAndCheck({ includeUnpublished: true }); } catch (_) {}
    throw error;
  }
}

function publishPending(actor) {
  if (!pending) throw new Error("Chưa có bài nào đã lưu và kiểm tra để đăng.");
  const branch = gitOutput(["branch", "--show-current"]);
  if (branch !== "main") throw new Error(`Đang ở nhánh ${branch || "không xác định"}; chỉ cho phép đăng từ nhánh main.`);

  if (!pending.committed) {
    if (pending.workflowStatus !== "APPROVED") throw new Error("Bài phải được người khác phê duyệt trước khi xuất bản.");
    const ahead = Number(gitOutput(["rev-list", "--count", "@{upstream}..HEAD"]) || "0");
    if (ahead > 0) throw new Error(`Đang có ${ahead} commit cũ chưa đẩy lên GitHub. Hãy xử lý các commit đó trước để trình đăng bài không đẩy kèm thay đổi ngoài ý muốn.`);
    const stagedBefore = gitOutput(["diff", "--cached", "--name-only"]);
    if (stagedBefore) throw new Error("Git đang có tệp được stage từ trước. Hãy commit hoặc bỏ stage các tệp đó rồi thử lại để tránh đăng nhầm.");

    const contentPath = pendingContentPath();
    const originalContent = fs.readFileSync(contentPath, "utf8");
    const originalPending = { ...pending };
    try {
      updatePendingWorkflow("PUBLISHED", actor, "Xuất bản lên website");
      buildAndCheck();
      gitOutput(["add", "--", ...pending.paths]);
      const staged = gitOutput(["diff", "--cached", "--name-only"]).split(/\r?\n/).filter(Boolean);
      const allowed = new Set(pending.paths.map((item) => item.replace(/\\/g, "/")));
      const unexpected = staged.filter((item) => !allowed.has(item.replace(/\\/g, "/")));
      if (unexpected.length) throw new Error(`Phát hiện tệp ngoài bài đăng trong vùng stage: ${unexpected.join(", ")}`);
      const commit = run("git", ["commit", "-m", `Đăng bài: ${pending.title}`]);
      if (commit.status !== 0) throw new Error((commit.stderr || commit.stdout || "Không tạo được commit.").trim());
      pending.committed = true;
      savePending();
    } catch (error) {
      run("git", ["restore", "--staged", "--", ...originalPending.paths]);
      fs.writeFileSync(contentPath, originalContent, "utf8");
      pending = originalPending;
      savePending();
      try { buildAndCheck({ includeUnpublished: true }); } catch (_) {}
      throw error;
    }
  } else if (pending.workflowStatus !== "PUBLISHED") {
    throw new Error("Trạng thái bài đã commit không hợp lệ; cần kiểm tra thủ công trước khi đẩy.");
  }

  const push = run("git", ["push", "origin", "main"]);
  if (push.status !== 0) throw new Error(`Đã tạo commit nhưng chưa đẩy được lên GitHub:\n${push.stderr || push.stdout}\nBạn có thể bấm Đăng lại sau khi xử lý kết nối.`);
  const result = { url: pending.url, title: pending.title, slug: pending.slug };
  pending = null;
  savePending();
  return result;
}

function approveAndPublish(actor) {
  if (!pending) throw new Error("Chưa có bài đang chờ thẩm định.");
  if (pending.workflowStatus === "REVIEW") approvePending(actor);
  if (["APPROVED", "PUBLISHED"].includes(pending.workflowStatus)) return publishPending(actor);
  throw new Error("Bài chưa được gửi tới bước thẩm định.");
}

function discardPending() {
  if (!pending) return;
  if (pending.committed) throw new Error("Bài đã được commit nên không thể hủy tự động. Hãy đẩy lại lên GitHub hoặc xử lý bằng Git.");
  pending.paths.forEach((rel) => fs.rmSync(path.join(root, rel), { force: true }));
  pending = null;
  savePending();
  buildAndCheck();
}

async function route(req, res) {
  const requestUrl = new URL(req.url, `http://${host}`);
  try {
    if (requestUrl.pathname === "/api/login" && req.method === "POST") {
      login(req, res, await readJson(req));
      return;
    }
    if (requestUrl.pathname === "/api/logout" && req.method === "POST") {
      logout(req, res);
      return;
    }

    if (requestUrl.pathname === "/admin/login" || requestUrl.pathname === "/admin/login/") {
      if (sessionFor(req)) redirect(res, "/admin");
      else sendFile(res, path.join(uiDir, "login.html"));
      return;
    }
    if (["/admin/login.css", "/admin/login.js"].includes(requestUrl.pathname)) {
      sendFile(res, path.join(uiDir, path.basename(requestUrl.pathname)));
      return;
    }

    if (requestUrl.pathname === "/" || requestUrl.pathname === "/admin/") {
      redirect(res, "/admin");
      return;
    }
    if (requestUrl.pathname === "/admin" && !sessionFor(req)) {
      redirect(res, "/admin/login");
      return;
    }

    const session = requireSession(req);
    if (requestUrl.pathname === "/api/config" && req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        ...sessionPayload(session),
        siteUrl,
        pending: publicPending(pending),
        maxImages,
        maxImageBytes,
        imageOptimization,
      });
      return;
    }
    if (requestUrl.pathname === "/api/change-password" && req.method === "POST") {
      assertCsrf(req, session);
      const input = await readJson(req);
      session.user = authStore.changePassword(session.user.username, input.currentPassword, input.newPassword);
      sendJson(res, 200, { ok: true, ...sessionPayload(session) });
      return;
    }
    if (session.user.mustChangePassword) throw new HttpError(403, "Bạn phải đổi mật khẩu tạm trước khi sử dụng cổng biên tập.");
    if (requestUrl.pathname === "/api/users" && req.method === "GET") {
      requirePermission(session, "manage-users");
      sendJson(res, 200, { ok: true, users: authStore.listUsers() });
      return;
    }
    if (requestUrl.pathname === "/api/users/update" && req.method === "POST") {
      requirePermission(session, "manage-users");
      assertCsrf(req, session);
      const input = await readJson(req);
      const user = authStore.updateUser(input.username, input);
      invalidateUserSessions(user.username, user.username === session.user.username ? session.id : "");
      if (user.username === session.user.username) session.user = user;
      sendJson(res, 200, { ok: true, user });
      return;
    }
    if (requestUrl.pathname === "/api/users/reset-password" && req.method === "POST") {
      requirePermission(session, "manage-users");
      assertCsrf(req, session);
      const input = await readJson(req);
      if (String(input.username || "").toLowerCase() === session.user.username) throw new Error("Hãy dùng chức năng Đổi mật khẩu để đổi mật khẩu của chính bạn.");
      const user = authStore.resetPassword(input.username, input.newPassword);
      invalidateUserSessions(user.username);
      sendJson(res, 200, { ok: true, user });
      return;
    }
    if (requestUrl.pathname === "/api/create" && req.method === "POST") {
      requirePermission(session, "create");
      assertCsrf(req, session);
      const input = await readJson(req);
      sendJson(res, 200, { ok: true, post: publicPending(createPost(input, session.user)) });
      return;
    }
    if (requestUrl.pathname === "/api/publish" && req.method === "POST") {
      requirePermission(session, "publish");
      assertCsrf(req, session);
      sendJson(res, 200, { ok: true, post: publishPending(session.user) });
      return;
    }
    if (requestUrl.pathname === "/api/review" && req.method === "POST") {
      requirePermission(session, "submit");
      assertCsrf(req, session);
      if (session.user.role !== "admin" && pending?.createdUsername !== session.user.username) throw new HttpError(403, "Chỉ người tạo bài hoặc quản trị viên được gửi bài này đi duyệt.");
      sendJson(res, 200, { ok: true, post: publicPending(submitPendingReview(session.user)) });
      return;
    }
    if (requestUrl.pathname === "/api/approve" && req.method === "POST") {
      requirePermission(session, "approve");
      assertCsrf(req, session);
      sendJson(res, 200, { ok: true, post: publicPending(approvePending(session.user)) });
      return;
    }
    if (requestUrl.pathname === "/api/approve-publish" && req.method === "POST") {
      requirePermission(session, "approve");
      requirePermission(session, "publish");
      assertCsrf(req, session);
      sendJson(res, 200, { ok: true, post: approveAndPublish(session.user) });
      return;
    }
    if (requestUrl.pathname === "/api/discard" && req.method === "POST") {
      requirePermission(session, "discard");
      assertCsrf(req, session);
      if (session.user.role !== "admin" && pending?.createdUsername !== session.user.username) throw new HttpError(403, "Bạn không thể hủy bài của tài khoản khác.");
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

    if (requestUrl.pathname === "/admin") {
      sendFile(res, path.join(uiDir, "index.html"));
      return;
    }
    const uiPath = requestUrl.pathname.replace(/^\/admin\//, "/");
    const file = safeJoin(uiDir, uiPath);
    if (!file) throw new Error("Đường dẫn giao diện không hợp lệ.");
    sendFile(res, file);
  } catch (error) {
    sendJson(res, error.status || 400, { ok: false, error: error.message || "Có lỗi không xác định." });
  }
}

function openBrowser(url) {
  if (process.platform === "win32") spawn("cmd.exe", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

const initialCredentials = authStore.initialize();
pending = loadPending();
const server = http.createServer(route);
const requestedPort = Math.round(envNumber("PUBLISHER_PORT", 0, 0, 65_535));
server.listen(requestedPort, host, () => {
  const address = server.address();
  const url = `http://${host}:${address.port}/admin`;
  console.log("============================================================");
  console.log("  CỔNG BIÊN TẬP NỘI BỘ — CẨM NANG AN TOÀN SỐ");
  console.log("============================================================");
  console.log(`Đang chạy tại: ${url}`);
  console.log("Chỉ truy cập từ máy này. Đóng cửa sổ này để tắt trình đăng bài.");
  if (initialCredentials.length) {
    console.log("");
    console.log("MẬT KHẨU TẠM — CHỈ HIỂN THỊ LẦN ĐẦU:");
    initialCredentials.forEach((item) => console.log(`  ${item.username.padEnd(8)} : ${item.password}`));
    console.log("Đăng nhập và đổi mật khẩu ngay. Hệ thống chỉ lưu bản băm, không lưu các mật khẩu trên.");
  }
  if (process.env.PUBLISHER_NO_BROWSER !== "1") openBrowser(url);
});

server.on("error", (error) => {
  console.error("Không thể khởi động trình đăng bài:", error.message);
  process.exitCode = 1;
});
