const encoder = new TextEncoder();

export const SESSION_COOKIE = "publisher_session";
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
// workerd currently caps PBKDF2 iterations at 100,000.
export const PASSWORD_ITERATIONS = 100_000;
export const MAX_IMAGES = 30;
export const MAX_IMAGE_BYTES = 2_500_000;
export const MAX_REQUEST_BYTES = 58 * 1024 * 1024;

export const ROLE_PERMISSIONS = Object.freeze({
  admin: ["create", "submit", "approve", "publish", "discard", "manage-users", "manage-messages", "manage-banner"],
  author: ["create", "submit", "discard"],
  approver: ["approve", "publish"],
});

export const CATEGORY_LABELS = Object.freeze({
  "an-ninh-mang": "An ninh mạng",
  "chuyen-doi-so": "Chuyển đổi số",
  "doi-moi-sang-tao": "Đổi mới sáng tạo",
  "nghien-cuu-khoa-hoc": "Nghiên cứu khoa học",
  khac: "Khác",
});

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function securityHeaders(cacheControl = "no-store") {
  return {
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

export function json(value, status = 200, extraHeaders = {}) {
  return Response.json(value, { status, headers: { ...securityHeaders(), ...extraHeaders } });
}

export function errorResponse(error) {
  const candidate = Number(error instanceof HttpError ? error.status : 400);
  const status = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599 ? candidate : 400;
  return json({ ok: false, error: error?.message || "Có lỗi không xác định." }, status);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function bytesToHex(value) {
  return [...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(value) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return bytesToBase64Url(value);
}

export async function sha256(value) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", encoder.encode(String(value))));
}

export async function passwordHash(password, salt, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(String(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(String(salt)), iterations }, key, 256);
  return bytesToHex(bits);
}

function constantTimeEqual(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index++) diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  return diff === 0;
}

export async function verifyPassword(user, password) {
  if (!user?.password_hash || !user?.salt) return false;
  const calculated = await passwordHash(password, user.salt, Number(user.iterations) || PASSWORD_ITERATIONS);
  return constantTimeEqual(calculated, user.password_hash);
}

export function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 12 || value.length > 160) throw new Error("Mật khẩu mới phải có từ 12 đến 160 ký tự.");
  if (!/[A-ZÀ-Ỹ]/u.test(value) || !/[a-zà-ỹ]/u.test(value) || !/\d/.test(value)) {
    throw new Error("Mật khẩu phải có chữ hoa, chữ thường và chữ số.");
  }
  return value;
}

export function publicUser(user) {
  return {
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    active: Number(user.active) !== 0,
    mustChangePassword: Number(user.must_change_password) === 1,
  };
}

export function permissionsFor(user) {
  return ROLE_PERMISSIONS[user?.role] || [];
}

export function requirePermission(session, permission) {
  if (!permissionsFor(session?.user).includes(permission)) throw new HttpError(403, "Tài khoản không có quyền thực hiện thao tác này.");
}

export function parseCookies(request) {
  return Object.fromEntries(String(request.headers.get("Cookie") || "").split(";").map((item) => item.trim()).filter(Boolean).map((item) => {
    const index = item.indexOf("=");
    return index < 0 ? [item, ""] : [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
  }));
}

export function sessionCookie(token, request, maxAge = Math.floor(SESSION_MAX_AGE_MS / 1000)) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

export async function getSession(context) {
  const token = parseCookies(context.request)[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await context.env.DB.prepare(`
    SELECT s.token_hash, s.csrf_token, s.expires_at,
           u.username, u.full_name, u.role, u.active, u.must_change_password
    FROM sessions s JOIN users u ON u.username = s.username
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1
  `).bind(tokenHash, Date.now()).first();
  if (!row) return null;
  return { tokenHash, csrfToken: row.csrf_token, expiresAt: row.expires_at, user: publicUser(row) };
}

export async function requireSession(context) {
  const session = await getSession(context);
  if (!session) throw new HttpError(401, "Bạn cần đăng nhập lại.");
  return session;
}

export function assertCsrf(context, session) {
  if (context.request.headers.get("X-Publisher-Token") !== session.csrfToken) {
    throw new HttpError(403, "Phiên làm việc không hợp lệ. Hãy tải lại trang.");
  }
  const origin = context.request.headers.get("Origin");
  if (origin && new URL(origin).origin !== new URL(context.request.url).origin) {
    throw new HttpError(403, "Yêu cầu không đến từ giao diện quản trị của website.");
  }
}

export async function readJson(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_REQUEST_BYTES) throw new HttpError(413, "Dữ liệu quá lớn. Hãy giảm số lượng hoặc dung lượng ảnh.");
  try {
    return await request.json();
  } catch (_) {
    throw new HttpError(400, "Dữ liệu gửi lên không hợp lệ.");
  }
}

export function cleanText(value, max, field, required = false) {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  if (required && !text) throw new Error(`Thiếu ${field}.`);
  if (text.length > max) throw new Error(`${field} dài quá giới hạn ${max} ký tự.`);
  return text;
}

export function cleanUrl(value, field) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    if (!/^https?:$/.test(url.protocol)) throw new Error();
    return url.href;
  } catch (_) {
    throw new Error(`${field} phải bắt đầu bằng http:// hoặc https://.`);
  }
}

export function slugify(value) {
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

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return /^https?:$/.test(url.protocol) ? url.href : "";
  } catch (_) {
    return "";
  }
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&amp;/gi, "&");
}

export function sanitizeInlineHtml(value, maxLength = 12_000) {
  const input = String(value || "");
  if (input.length > maxLength * 2) throw new Error("Một khối nội dung dài quá giới hạn cho phép.");
  const tagPattern = /<[^>]*>/g;
  const simpleTags = new Set(["strong", "em", "u", "sup", "sub"]);
  const aliases = { b: "strong", i: "em" };
  let output = "";
  let cursor = 0;
  let openAnchors = 0;
  let match;
  while ((match = tagPattern.exec(input))) {
    output += escapeHtml(decodeEntities(input.slice(cursor, match.index)));
    cursor = match.index + match[0].length;
    const parsed = match[0].match(/^<\s*(\/?)\s*([a-z0-9]+)([^>]*)>$/i);
    if (!parsed) continue;
    const closing = parsed[1] === "/";
    const name = aliases[parsed[2].toLowerCase()] || parsed[2].toLowerCase();
    if (name === "br" && !closing) output += "<br>";
    else if (simpleTags.has(name)) output += closing ? `</${name}>` : `<${name}>`;
    else if (name === "a") {
      if (closing && openAnchors > 0) { output += "</a>"; openAnchors--; }
      else if (!closing) {
        const hrefMatch = parsed[3].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
        const href = safeHttpUrl(hrefMatch && (hrefMatch[1] || hrefMatch[2] || hrefMatch[3]));
        if (href) { output += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`; openAnchors++; }
      }
    }
  }
  output += escapeHtml(decodeEntities(input.slice(cursor)));
  while (openAnchors-- > 0) output += "</a>";
  if (output.length > maxLength) throw new Error("Một khối nội dung dài quá giới hạn cho phép.");
  return output;
}

function cleanCaption(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 260);
}

export function normalizeBlocks(rawBlocks, imagePaths = new Map()) {
  const types = new Set(["paragraph", "heading2", "heading3", "blockquote", "ul", "ol", "image", "separator"]);
  const alignments = new Set(["left", "center", "right", "justify"]);
  if (!Array.isArray(rawBlocks) || rawBlocks.length > 240) throw new Error("Nội dung bài viết không hợp lệ hoặc có quá nhiều khối.");
  const blocks = [];
  for (const raw of rawBlocks) {
    if (!raw || typeof raw !== "object" || !types.has(raw.type)) continue;
    const align = alignments.has(raw.align) ? raw.align : "left";
    if (raw.type === "image") {
      const src = imagePaths.get(String(raw.imageId || ""));
      if (!src) throw new Error("Ảnh chèn trong bài không hợp lệ hoặc chưa được tải lên.");
      blocks.push({ type: "image", src, caption: cleanCaption(raw.caption) });
    } else if (raw.type === "separator") blocks.push({ type: "separator" });
    else if (raw.type === "ul" || raw.type === "ol") {
      const items = (Array.isArray(raw.items) ? raw.items : []).slice(0, 100).map((item) => sanitizeInlineHtml(item, 4_000)).filter((item) => item.replace(/<[^>]+>/g, "").trim());
      if (items.length) blocks.push({ type: raw.type, align, items });
    } else {
      const html = sanitizeInlineHtml(raw.html, 12_000);
      if (html.replace(/<[^>]+>/g, "").trim() || /<br>/.test(html)) blocks.push({ type: raw.type, align, html });
    }
  }
  return blocks;
}

export function renderBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((block) => {
    const attrs = block.align && block.align !== "left" ? ` class="text-align-${block.align}"` : "";
    if (block.type === "paragraph") return `<p${attrs}>${block.html}</p>`;
    if (block.type === "heading2") return `<h2${attrs}>${block.html}</h2>`;
    if (block.type === "heading3") return `<h3${attrs}>${block.html}</h3>`;
    if (block.type === "blockquote") return `<blockquote${attrs}>${block.html}</blockquote>`;
    if (block.type === "ul" || block.type === "ol") return `<${block.type}${attrs}>${block.items.map((item) => `<li>${item}</li>`).join("")}</${block.type}>`;
    if (block.type === "separator") return "<hr>";
    if (block.type === "image") return `<figure class="article-inline-image"><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.caption || "Ảnh minh họa")}" loading="lazy" decoding="async">${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""}</figure>`;
    return "";
  }).join("");
}

export function plainTextFromBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((block) => Array.isArray(block.items) ? block.items.join(" ") : block.caption || block.html || "").join(" ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}

function parseJson(value, fallback) {
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

export function pendingFromRow(row, origin) {
  if (!row) return null;
  const prefix = row.type === "skill" ? "ky-nang" : "hoat-dong";
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    url: `${origin}/${prefix}/${encodeURIComponent(row.slug)}/`,
    previewUrl: `/preview/${prefix}/${encodeURIComponent(row.slug)}/`,
    committed: false,
    workflowStatus: row.status,
    createdBy: row.author_name,
    createdUsername: row.author_username,
    reviewedBy: row.reviewed_by || "",
    approvedBy: row.approved_by || "",
    publishedBy: row.published_by || "",
  };
}

export async function findPending(env, user, origin) {
  let statement;
  if (user.role === "admin") {
    statement = env.DB.prepare("SELECT * FROM posts WHERE status <> 'PUBLISHED' ORDER BY updated_at DESC LIMIT 1");
  } else if (user.role === "approver") {
    statement = env.DB.prepare("SELECT * FROM posts WHERE status IN ('REVIEW','APPROVED') ORDER BY updated_at ASC LIMIT 1");
  } else {
    statement = env.DB.prepare("SELECT * FROM posts WHERE author_username = ? AND status IN ('DRAFT','REVIEW') ORDER BY updated_at DESC LIMIT 1").bind(user.username);
  }
  return pendingFromRow(await statement.first(), origin);
}

export function publicPostFromRow(row) {
  const images = parseJson(row.images_json, []).filter((item) => item.kind !== "inline").map((item) => ({ src: item.path, role: item.kind, caption: item.caption || "" }));
  const coverIndex = images.findIndex((item) => item.role === "cover");
  if (coverIndex > 0) images.unshift(...images.splice(coverIndex, 1));
  const cover = images.find((item) => item.role === "cover") || images[0] || null;
  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    date: row.publish_date,
    category: row.category,
    categoryLabel: CATEGORY_LABELS[row.category] || CATEGORY_LABELS.khac,
    placement: row.placement,
    location: row.location || "",
    series: row.series || "",
    order: row.sort_order || null,
    bodyHtml: row.body_html,
    author: row.author_name,
    image: cover?.src || "",
    images,
    link: row.reference_link || "",
    videoUrl: row.video_url || "",
    featured: Number(row.featured) === 1,
    pageUrl: `/${row.type === "skill" ? "ky-nang" : "hoat-dong"}/${encodeURIComponent(row.slug)}/`,
    workflowStatus: row.status,
  };
}

export async function getPostBySlug(env, type, slug, includeUnpublished = false) {
  const query = includeUnpublished
    ? "SELECT * FROM posts WHERE type = ? AND slug = ? LIMIT 1"
    : "SELECT * FROM posts WHERE type = ? AND slug = ? AND status = 'PUBLISHED' LIMIT 1";
  return env.DB.prepare(query).bind(type, slug).first();
}

export function base64Jpeg(dataUrl, index) {
  const match = String(dataUrl || "").match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error(`Ảnh số ${index + 1} chưa được chuẩn hóa thành JPEG.`);
  const binary = atob(match[1]);
  if (!binary.length || binary.length > MAX_IMAGE_BYTES) throw new Error(`Ảnh số ${index + 1} vượt quá 2,5 MB sau tối ưu.`);
  const bytes = new Uint8Array(binary.length);
  for (let offset = 0; offset < binary.length; offset++) bytes[offset] = binary.charCodeAt(offset);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
    throw new Error(`Ảnh số ${index + 1} không phải JPEG hợp lệ.`);
  }
  return bytes;
}

function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export async function renderArticle(context, row, preview = false) {
  const post = publicPostFromRow(row);
  const kindLabel = row.type === "skill" ? "Bộ kỹ năng số" : "Hoạt động tuyên truyền";
  const prefix = row.type === "skill" ? "ky-nang" : "hoat-dong";
  const canonical = `${new URL(context.request.url).origin}/${prefix}/${encodeURIComponent(row.slug)}/`;
  const cover = post.images[0];
  const gallery = post.images.slice(1);
  let site = {};
  try {
    const assetUrl = new URL("/data/site.json", context.request.url);
    const response = await context.env.ASSETS.fetch(new Request(assetUrl));
    if (response.ok) site = await response.json();
  } catch (_) {}
  const footer = site.footer || {};
  const academy = footer.governingBody || "Học viện Cảnh sát nhân dân";
  const unit = footer.managingUnit || "Khoa Toán - Tin học và Ứng dụng KHCN trong PCTP";
  const siteName = footer.siteName || "Website chuyên đề Cẩm nang An toàn số";
  const meta = [formatDate(row.publish_date), CATEGORY_LABELS[row.category], row.location].filter(Boolean).map(escapeHtml).join(" · ");
  const references = [row.reference_link ? `<a class="article-reference" href="${escapeHtml(row.reference_link)}" target="_blank" rel="noopener noreferrer">Xem nguồn tham khảo ↗</a>` : "", row.video_url ? `<a class="article-reference" href="${escapeHtml(row.video_url)}" target="_blank" rel="noopener noreferrer">Xem video ↗</a>` : ""].filter(Boolean).join("");
  const page = `<!doctype html><html lang="vi-VN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(row.title)} | Cẩm nang An toàn số</title><meta name="description" content="${escapeHtml(row.summary)}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:locale" content="vi_VN"><meta property="og:site_name" content="Cẩm nang An toàn số"><meta property="og:title" content="${escapeHtml(row.title)}"><meta property="og:description" content="${escapeHtml(row.summary)}"><meta property="og:url" content="${canonical}">${cover ? `<meta property="og:image" content="${new URL(cover.src, canonical).href}">` : ""}<link rel="icon" href="/img/favicon.png"><link rel="stylesheet" href="/css/article.css"></head><body>
  <header class="article-header"><a class="article-brand" href="/" aria-label="Về trang chủ"><img src="/img/badge.png" alt="Logo Cẩm nang An toàn số của Khoa KTT" width="76" height="58"><span><strong>CẨM NANG AN TOÀN SỐ</strong><small>Của Khoa KTT, Học viện CSND</small></span></a><a class="back-home" href="/">← Trang chủ</a></header>
  <main class="article-shell"><nav class="article-breadcrumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span aria-hidden="true">›</span><span>${kindLabel}</span></nav><article class="article-card">${preview ? `<div class="article-preview-notice">BẢN XEM TRƯỚC · ${escapeHtml(row.status)}</div>` : ""}<div class="article-kicker">${kindLabel}</div><h1>${escapeHtml(row.title)}</h1>${meta ? `<p class="article-meta">${meta}</p>` : ""}<p class="article-lead">${escapeHtml(row.summary)}</p>${cover ? `<figure class="article-cover"><img src="${escapeHtml(cover.src)}" alt="${escapeHtml(cover.caption || row.title)}" decoding="async">${cover.caption ? `<figcaption>${escapeHtml(cover.caption)}</figcaption>` : ""}</figure>` : ""}<div class="article-content">${row.body_html}</div>${gallery.length ? `<section class="article-documentary-images" aria-label="Ảnh tư liệu"><h2>Ảnh tư liệu</h2><div class="article-gallery">${gallery.map((item) => `<figure><a href="${escapeHtml(item.src)}" target="_blank" rel="noopener"><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.caption || row.title)}" loading="lazy" decoding="async"></a>${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ""}</figure>`).join("")}</div></section>` : ""}${references ? `<div class="article-references">${references}</div>` : ""}<p class="article-author">Tác giả: ${escapeHtml(row.author_name)}</p><div class="article-actions"><button type="button" id="copy-link" class="primary-action">Sao chép liên kết</button><button type="button" id="share-link" class="secondary-action">Chia sẻ bài</button></div><p id="share-status" class="share-status" aria-live="polite"></p></article></main>
  <footer class="article-footer"><strong>${escapeHtml(academy.toUpperCase())}</strong><span>${escapeHtml(unit.toUpperCase())}</span><span>${escapeHtml(siteName.toUpperCase())}</span><span>Cơ quan chủ quản: ${escapeHtml(academy)}</span><span>Đơn vị quản lý: ${escapeHtml(unit)}</span><span>Chịu trách nhiệm quản lý nội dung: ${escapeHtml(footer.contentManager || "")}</span><span>Quản trị kỹ thuật: ${escapeHtml(footer.technicalManager || "")}</span>${footer.notice ? `<span class="article-footer-notice">${escapeHtml(footer.notice)}</span>` : ""}${footer.statusNotice ? `<span class="article-footer-status">${escapeHtml(footer.statusNotice)}</span>` : ""}<nav aria-label="Thông tin pháp lý và liên hệ"><a href="/#gioi-thieu">Giới thiệu</a><a href="/terms/">Điều khoản sử dụng</a><a href="/privacy/">Chính sách bảo vệ dữ liệu cá nhân</a><a href="/nguon-tin/">Bản quyền và nguồn thông tin</a><a href="/contact/">Liên hệ</a></nav></footer><script src="/js/article.js" defer></script><script src="/js/engagement.js" defer></script></body></html>`;
  return new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8", ...securityHeaders(preview ? "no-store" : "public, max-age=60, stale-while-revalidate=300"), "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; frame-ancestors 'none'" } });
}
