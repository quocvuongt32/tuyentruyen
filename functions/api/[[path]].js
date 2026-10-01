import {
  CATEGORY_LABELS,
  HttpError,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  PASSWORD_ITERATIONS,
  SESSION_MAX_AGE_MS,
  assertCsrf,
  base64Jpeg,
  cleanText,
  cleanUrl,
  errorResponse,
  findPending,
  getSession,
  json,
  normalizeBlocks,
  passwordHash,
  pendingFromRow,
  permissionsFor,
  plainTextFromBlocks,
  publicPostFromRow,
  publicUser,
  randomToken,
  readJson,
  renderBlocks,
  requirePermission,
  requireSession,
  sessionCookie,
  sha256,
  slugify,
  validatePassword,
  verifyPassword,
} from "../_lib/platform.js";

function routePath(context) {
  const value = context.params.path;
  return Array.isArray(value) ? value.join("/") : String(value || "");
}

function origin(context) {
  return new URL(context.request.url).origin;
}

const VISIT_SESSION_MS = 30 * 60 * 1000;
const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const MESSAGE_COOLDOWN_MS = 60 * 1000;
const MAX_BANNER_IMAGES = 30;
const MAX_BANNER_UPLOAD_BATCH = 8;

function dateKey(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function assertSameOrigin(context) {
  const requestOrigin = context.request.headers.get("Origin");
  if (requestOrigin && requestOrigin !== origin(context)) {
    throw new HttpError(403, "Yêu cầu không đến từ website này.");
  }
}

async function visitorHash(input) {
  const token = String(input?.visitorToken || "").trim();
  if (!/^[a-zA-Z0-9_-]{20,160}$/.test(token)) throw new HttpError(400, "Mã phiên truy cập không hợp lệ.");
  return sha256(`visitor|${token}`);
}

async function userByName(env, username) {
  return env.DB.prepare("SELECT * FROM users WHERE username = ? LIMIT 1").bind(String(username || "").trim().toLowerCase()).first();
}

async function clearExpiredSessions(env) {
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(Date.now()).run();
}

async function checkLoginRate(context, username) {
  const ip = context.request.headers.get("CF-Connecting-IP") || "unknown";
  const identity = await sha256(`${ip}|${username}`);
  const row = await context.env.DB.prepare("SELECT * FROM login_attempts WHERE identity = ?").bind(identity).first();
  const now = Date.now();
  if (row && Number(row.blocked_until) > now) throw new HttpError(429, "Đăng nhập sai quá nhiều lần. Hãy chờ 15 phút rồi thử lại.");
  return { identity, row, now };
}

async function recordLoginFailure(env, rate) {
  const windowMs = 15 * 60 * 1000;
  const sameWindow = rate.row && Number(rate.row.window_started_at) > rate.now - windowMs;
  const failures = sameWindow ? Number(rate.row.failures) + 1 : 1;
  const blockedUntil = failures >= 5 ? rate.now + windowMs : 0;
  await env.DB.prepare(`INSERT INTO login_attempts(identity, failures, window_started_at, blocked_until, updated_at)
    VALUES(?,?,?,?,?) ON CONFLICT(identity) DO UPDATE SET failures=excluded.failures, window_started_at=excluded.window_started_at,
    blocked_until=excluded.blocked_until, updated_at=excluded.updated_at`)
    .bind(rate.identity, failures, sameWindow ? rate.row.window_started_at : rate.now, blockedUntil, rate.now).run();
}

async function login(context, input) {
  const username = String(input.username || "").trim().toLowerCase();
  const rate = await checkLoginRate(context, username);
  const user = await userByName(context.env, username);
  const valid = user && Number(user.active) === 1
    ? await verifyPassword(user, input.password)
    : await verifyPassword({ salt: "invalid-user-salt", password_hash: "0".repeat(64), iterations: PASSWORD_ITERATIONS }, input.password);
  if (!valid) {
    await recordLoginFailure(context.env, rate);
    throw new HttpError(401, "Tên đăng nhập hoặc mật khẩu không đúng.");
  }
  await context.env.DB.prepare("DELETE FROM login_attempts WHERE identity = ?").bind(rate.identity).run();
  const token = randomToken(36);
  const tokenHash = await sha256(token);
  const csrfToken = randomToken(24);
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS;
  await context.env.DB.prepare("INSERT INTO sessions(token_hash, username, csrf_token, expires_at, created_at) VALUES(?,?,?,?,?)")
    .bind(tokenHash, user.username, csrfToken, expiresAt, Date.now()).run();
  context.waitUntil(clearExpiredSessions(context.env));
  const safeUser = publicUser(user);
  return json({ ok: true, user: safeUser, csrfToken, permissions: permissionsFor(safeUser) }, 200, { "Set-Cookie": sessionCookie(token, context.request) });
}

async function logout(context) {
  const session = await getSession(context);
  if (session) await context.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(session.tokenHash).run();
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", context.request, 0) });
}

async function config(context, session) {
  const unreadMessages = permissionsFor(session.user).includes("manage-messages")
    ? Number((await context.env.DB.prepare("SELECT COUNT(*) AS total FROM feedback_messages WHERE status='NEW'").first())?.total || 0)
    : 0;
  return json({
    ok: true,
    user: session.user,
    csrfToken: session.csrfToken,
    permissions: permissionsFor(session.user),
    siteUrl: origin(context),
    pending: await findPending(context.env, session.user, origin(context)),
    maxImages: MAX_IMAGES,
    maxImageBytes: MAX_IMAGE_BYTES,
    imageOptimization: { maxEdge: 1920, targetBytes: 1_250_000, maxBytes: MAX_IMAGE_BYTES, minQuality: 0.74, maxQuality: 0.92, maxSourceBytes: 250 * 1024 * 1024 },
    deploymentMode: "cloud",
    unreadMessages,
  });
}

async function changePassword(context, session, input) {
  assertCsrf(context, session);
  const user = await userByName(context.env, session.user.username);
  if (!await verifyPassword(user, input.currentPassword)) throw new Error("Mật khẩu hiện tại không đúng.");
  const value = validatePassword(input.newPassword);
  const salt = randomToken(18);
  const hash = await passwordHash(value, salt, PASSWORD_ITERATIONS);
  await context.env.DB.batch([
    context.env.DB.prepare("UPDATE users SET salt=?, password_hash=?, iterations=?, must_change_password=0, updated_at=? WHERE username=?")
      .bind(salt, hash, PASSWORD_ITERATIONS, Date.now(), user.username),
    context.env.DB.prepare("DELETE FROM sessions WHERE username=? AND token_hash<>?").bind(user.username, session.tokenHash),
  ]);
  const updated = await userByName(context.env, user.username);
  return json({ ok: true, user: publicUser(updated), csrfToken: session.csrfToken, permissions: permissionsFor(updated) });
}

async function listUsers(context, session) {
  requirePermission(session, "manage-users");
  const result = await context.env.DB.prepare("SELECT * FROM users ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'approver' THEN 2 ELSE 3 END, username").all();
  return json({ ok: true, users: (result.results || []).map(publicUser) });
}

async function updateUser(context, session, input) {
  requirePermission(session, "manage-users");
  assertCsrf(context, session);
  const username = String(input.username || "").trim().toLowerCase();
  const current = await userByName(context.env, username);
  if (!current) throw new Error("Không tìm thấy tài khoản.");
  const role = ["admin", "author", "approver"].includes(input.role) ? input.role : current.role;
  const fullName = cleanText(input.fullName, 160, "họ tên", true).replace(/\s+/g, " ");
  const active = input.active === false ? 0 : 1;
  if (username === session.user.username && (role !== current.role || active !== Number(current.active))) {
    throw new Error("Không thể tự đổi vai trò hoặc khóa chính tài khoản đang đăng nhập.");
  }
  if (current.role === "admin" && (!active || role !== "admin")) {
    const count = await context.env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE username <> ? AND role='admin' AND active=1").bind(username).first();
    if (!Number(count?.total)) throw new Error("Phải giữ lại ít nhất một tài khoản quản trị đang hoạt động.");
  }
  await context.env.DB.prepare("UPDATE users SET full_name=?, role=?, active=?, updated_at=? WHERE username=?")
    .bind(fullName, role, active, Date.now(), username).run();
  if (!active || role !== current.role) await context.env.DB.prepare("DELETE FROM sessions WHERE username=? AND token_hash<>?").bind(username, session.tokenHash).run();
  return json({ ok: true, user: publicUser(await userByName(context.env, username)) });
}

async function resetPassword(context, session, input) {
  requirePermission(session, "manage-users");
  assertCsrf(context, session);
  const username = String(input.username || "").trim().toLowerCase();
  if (username === session.user.username) throw new Error("Hãy dùng chức năng Đổi mật khẩu để đổi mật khẩu của chính bạn.");
  if (!await userByName(context.env, username)) throw new Error("Không tìm thấy tài khoản.");
  const value = validatePassword(input.newPassword);
  const salt = randomToken(18);
  const hash = await passwordHash(value, salt, PASSWORD_ITERATIONS);
  await context.env.DB.batch([
    context.env.DB.prepare("UPDATE users SET salt=?, password_hash=?, iterations=?, must_change_password=1, updated_at=? WHERE username=?").bind(salt, hash, PASSWORD_ITERATIONS, Date.now(), username),
    context.env.DB.prepare("DELETE FROM sessions WHERE username=?").bind(username),
  ]);
  return json({ ok: true, user: publicUser(await userByName(context.env, username)) });
}

async function uniqueSlug(context, type, preferred) {
  let staticSlugs = new Set();
  try {
    const response = await context.env.ASSETS.fetch(new Request(new URL("/data/static-slugs.json", context.request.url)));
    if (response.ok) {
      const data = await response.json();
      staticSlugs = new Set(Array.isArray(data[type]) ? data[type] : []);
    }
  } catch (_) {}
  let candidate = preferred;
  let suffix = 2;
  while (true) {
    const exists = await context.env.DB.prepare("SELECT 1 AS found FROM posts WHERE type=? AND slug=? LIMIT 1").bind(type, candidate).first();
    if (!exists && !staticSlugs.has(candidate)) return candidate;
    candidate = `${preferred}-${suffix++}`;
  }
}

async function createPost(context, session, input) {
  requirePermission(session, "create");
  assertCsrf(context, session);
  const active = await context.env.DB.prepare("SELECT title FROM posts WHERE status <> 'PUBLISHED' LIMIT 1").first();
  if (active) throw new Error(`Đang có bài “${active.title}” chờ xử lý. Hãy hoàn tất hoặc hủy bài đó trước.`);
  const type = input.type === "skill" ? "skill" : input.type === "event" ? "event" : "";
  if (!type) throw new Error("Loại bài không hợp lệ.");
  const title = cleanText(input.title, 180, "tiêu đề", true);
  const summary = cleanText(input.summary, 320, "tóm tắt", true);
  const publishDate = cleanText(input.date, 10, "ngày đăng", true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) throw new Error("Ngày đăng phải theo định dạng YYYY-MM-DD.");
  const placement = type === "event" && input.placement === "activity" ? "activity" : "timeline";
  let category = Object.hasOwn(CATEGORY_LABELS, input.category) ? input.category : "khac";
  if (type === "event" && placement === "timeline") category = "an-ninh-mang";
  const baseSlug = slugify(input.slug || title);
  if (!baseSlug) throw new Error("Không tạo được đường dẫn từ tiêu đề.");
  const slug = await uniqueSlug(context, type, baseSlug);
  const images = Array.isArray(input.images) ? input.images : [];
  if (!images.length) throw new Error("Cần chọn ít nhất một ảnh đại diện.");
  if (images.length > MAX_IMAGES) throw new Error(`Mỗi bài tối đa ${MAX_IMAGES} ảnh.`);
  const ids = new Set();
  const decoded = images.map((item, index) => {
    const id = /^img-[a-zA-Z0-9-]{8,80}$/.test(String(item?.id || "")) ? item.id : `img-${crypto.randomUUID()}`;
    if (ids.has(id)) throw new Error("Danh sách ảnh có mã bị trùng.");
    ids.add(id);
    return { id, kind: ["cover", "gallery", "inline"].includes(item?.kind) ? item.kind : index ? "gallery" : "cover", caption: cleanText(item?.caption, 260, "chú thích ảnh"), bytes: base64Jpeg(item?.dataUrl, index) };
  });
  if (!decoded.some((item) => item.kind === "cover")) {
    const fallback = decoded.find((item) => item.kind !== "inline");
    if (fallback) fallback.kind = "cover";
  }
  if (!decoded.some((item) => item.kind === "cover")) throw new Error("Cần chọn một ảnh đại diện cho bài.");
  let coverSeen = false;
  decoded.forEach((item) => { if (item.kind === "cover") { if (coverSeen) item.kind = "gallery"; else coverSeen = true; } });
  const postId = crypto.randomUUID();
  const media = decoded.map((item) => ({ id: item.id, kind: item.kind, caption: item.caption, key: `posts/${postId}/${item.id}.jpg`, path: `/media/posts/${postId}/${item.id}.jpg`, bytes: item.bytes }));
  const imagePaths = new Map(media.map((item) => [item.id, item.path]));
  const blocks = normalizeBlocks(input.bodyBlocks, imagePaths);
  const bodyText = cleanText(plainTextFromBlocks(blocks), 30_000, "nội dung", true);
  if (bodyText.length < 30) throw new Error("Nội dung cần ít nhất 30 ký tự.");
  const bodyHtml = renderBlocks(blocks);
  const now = Date.now();
  const revision = [{ status: "DRAFT", actor: session.user.fullName, username: session.user.username, at: new Date(now).toISOString(), note: "Tạo bản nháp trên cổng quản trị" }];
  const uploaded = [];
  try {
    for (const item of media) {
      await context.env.MEDIA.put(item.key, item.bytes, { metadata: { contentType: "image/jpeg" } });
      uploaded.push(item.key);
    }
    const publicMedia = media.map(({ bytes, ...item }) => item);
    await context.env.DB.prepare(`INSERT INTO posts(
      id,type,slug,title,summary,publish_date,placement,category,location,series,sort_order,body_blocks_json,body_html,body_text,
      author_username,author_name,images_json,reference_link,video_url,featured,status,created_at,updated_at,revision_history_json
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      postId, type, slug, title, summary, publishDate, placement, category,
      type === "event" ? cleanText(input.location, 220, "địa điểm") : "",
      type === "skill" ? cleanText(input.series, 160, "tên chuỗi") : "",
      type === "skill" && Number.isInteger(Number(input.order)) && Number(input.order) > 0 ? Number(input.order) : null,
      JSON.stringify(blocks), bodyHtml, bodyText, session.user.username, session.user.fullName, JSON.stringify(publicMedia),
      type === "event" ? cleanUrl(input.link, "Link tham khảo") : "",
      type === "event" ? cleanUrl(input.video, "Link video") : "",
      input.featuredBanner === true ? 1 : 0, "DRAFT", now, now, JSON.stringify(revision)
    ).run();
  } catch (error) {
    await Promise.all(uploaded.map((key) => context.env.MEDIA.delete(key).catch(() => {})));
    throw error;
  }
  const row = await context.env.DB.prepare("SELECT * FROM posts WHERE id=?").bind(postId).first();
  return json({ ok: true, post: pendingFromRow(row, origin(context)) });
}

async function pendingRow(context, session) {
  let query;
  if (session.user.role === "admin") query = context.env.DB.prepare("SELECT * FROM posts WHERE status <> 'PUBLISHED' ORDER BY updated_at DESC LIMIT 1");
  else if (session.user.role === "approver") query = context.env.DB.prepare("SELECT * FROM posts WHERE status IN ('REVIEW','APPROVED') ORDER BY updated_at ASC LIMIT 1");
  else query = context.env.DB.prepare("SELECT * FROM posts WHERE author_username=? AND status IN ('DRAFT','REVIEW') ORDER BY updated_at DESC LIMIT 1").bind(session.user.username);
  const row = await query.first();
  if (!row) throw new Error("Không có bài phù hợp đang chờ xử lý.");
  return row;
}

function appendRevision(row, status, session, note) {
  let history = [];
  try { history = JSON.parse(row.revision_history_json || "[]"); } catch (_) {}
  history.push({ status, actor: session.user.fullName, username: session.user.username, at: new Date().toISOString(), note });
  return JSON.stringify(history);
}

async function submitReview(context, session) {
  requirePermission(session, "submit");
  assertCsrf(context, session);
  const row = await pendingRow(context, session);
  if (row.status !== "DRAFT") throw new Error("Chỉ bản nháp mới được gửi thẩm định.");
  if (session.user.role !== "admin" && row.author_username !== session.user.username) throw new HttpError(403, "Chỉ người tạo bài hoặc quản trị viên được gửi bài này đi thẩm định.");
  const now = Date.now();
  const result = await context.env.DB.prepare("UPDATE posts SET status='REVIEW', reviewed_by=?, reviewed_username=?, reviewed_at=?, updated_at=?, revision_history_json=? WHERE id=? AND status='DRAFT'")
    .bind(session.user.fullName, session.user.username, now, now, appendRevision(row, "REVIEW", session, "Gửi bài đi thẩm định"), row.id).run();
  if (Number(result.meta?.changes) !== 1) throw new HttpError(409, "Trạng thái bài vừa thay đổi. Hãy tải lại trang.");
  return json({ ok: true, post: pendingFromRow(await context.env.DB.prepare("SELECT * FROM posts WHERE id=?").bind(row.id).first(), origin(context)) });
}

async function approveAndPublish(context, session) {
  requirePermission(session, "approve");
  requirePermission(session, "publish");
  assertCsrf(context, session);
  const row = await pendingRow(context, session);
  if (!["REVIEW", "APPROVED"].includes(row.status)) throw new Error("Bài chưa được gửi tới bước thẩm định.");
  if (session.user.role !== "admin" && row.author_username === session.user.username) throw new Error("Người tạo bài không được tự phê duyệt bài của mình.");
  const now = Date.now();
  const history = appendRevision(row, "PUBLISHED", session, row.status === "REVIEW" ? "Thẩm định, phê duyệt và xuất bản" : "Xuất bản bài đã phê duyệt");
  const result = await context.env.DB.prepare(`UPDATE posts SET status='PUBLISHED', approved_by=COALESCE(approved_by,?), approved_username=COALESCE(approved_username,?),
    approved_at=COALESCE(approved_at,?), published_by=?, published_username=?, published_at=?, updated_at=?, revision_history_json=? WHERE id=? AND status=?`)
    .bind(session.user.fullName, session.user.username, now, session.user.fullName, session.user.username, now, now, history, row.id, row.status).run();
  if (Number(result.meta?.changes) !== 1) throw new HttpError(409, "Trạng thái bài vừa thay đổi. Hãy tải lại trang.");
  const updated = await context.env.DB.prepare("SELECT * FROM posts WHERE id=?").bind(row.id).first();
  return json({ ok: true, post: pendingFromRow(updated, origin(context)) });
}

async function publishApproved(context, session) {
  requirePermission(session, "publish");
  assertCsrf(context, session);
  const row = await pendingRow(context, session);
  if (row.status !== "APPROVED") throw new Error("Không có bài đã duyệt đang chờ xuất bản.");
  const now = Date.now();
  const result = await context.env.DB.prepare("UPDATE posts SET status='PUBLISHED', published_by=?, published_username=?, published_at=?, updated_at=?, revision_history_json=? WHERE id=? AND status='APPROVED'")
    .bind(session.user.fullName, session.user.username, now, now, appendRevision(row, "PUBLISHED", session, "Xuất bản bài đã phê duyệt"), row.id).run();
  if (Number(result.meta?.changes) !== 1) throw new HttpError(409, "Trạng thái bài vừa thay đổi. Hãy tải lại trang.");
  return json({ ok: true, post: pendingFromRow(await context.env.DB.prepare("SELECT * FROM posts WHERE id=?").bind(row.id).first(), origin(context)) });
}

async function discard(context, session) {
  requirePermission(session, "discard");
  assertCsrf(context, session);
  const row = await pendingRow(context, session);
  if (session.user.role !== "admin" && row.author_username !== session.user.username) throw new HttpError(403, "Bạn không thể hủy bài của tài khoản khác.");
  let images = [];
  try { images = JSON.parse(row.images_json || "[]"); } catch (_) {}
  const result = await context.env.DB.prepare("DELETE FROM posts WHERE id=? AND status=?").bind(row.id, row.status).run();
  if (Number(result.meta?.changes) !== 1) throw new HttpError(409, "Trạng thái bài vừa thay đổi. Hãy tải lại trang.");
  await Promise.all(images.map((item) => item.key ? context.env.MEDIA.delete(item.key) : Promise.resolve()));
  return json({ ok: true });
}

async function publicPosts(context) {
  const type = new URL(context.request.url).searchParams.get("type");
  const where = type === "event" || type === "skill" ? " AND type = ?" : "";
  const statement = context.env.DB.prepare(`SELECT * FROM posts WHERE status='PUBLISHED'${where} ORDER BY publish_date DESC, published_at DESC LIMIT 100`);
  const result = where ? await statement.bind(type).all() : await statement.all();
  return json({ ok: true, posts: (result.results || []).map(publicPostFromRow) }, 200, { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" });
}

function normalizeBannerInterval(value) {
  const interval = Number(value);
  if (!Number.isInteger(interval) || interval < 2000 || interval > 20000) {
    throw new Error("Tốc độ banner phải từ 2 đến 20 giây.");
  }
  return interval;
}

async function bannerData(context) {
  const [settings, images] = await Promise.all([
    context.env.DB.prepare("SELECT interval_ms FROM site_banner_settings WHERE id=1").first(),
    context.env.DB.prepare("SELECT id,path,caption,sort_order,storage_key FROM site_banner_images ORDER BY sort_order,created_at,id").all(),
  ]);
  return {
    intervalMs: Number(settings?.interval_ms || 4000),
    images: (images.results || []).map((item) => ({
      id: item.id,
      src: item.path,
      caption: item.caption || "",
      sortOrder: Number(item.sort_order || 0),
      uploaded: Boolean(item.storage_key),
    })),
  };
}

async function publicBanner(context) {
  const data = await bannerData(context);
  return json({ ok: true, ...data }, 200, { "Cache-Control": "no-store" });
}

async function adminBanner(context, session) {
  requirePermission(session, "manage-banner");
  return json({ ok: true, ...(await bannerData(context)), maxImages: MAX_BANNER_IMAGES, maxUploadBatch: MAX_BANNER_UPLOAD_BATCH });
}

async function uploadBannerImages(context, session, input) {
  requirePermission(session, "manage-banner");
  assertCsrf(context, session);
  const inputImages = Array.isArray(input?.images) ? input.images : [];
  if (!inputImages.length) throw new Error("Hãy chọn ít nhất một ảnh banner.");
  if (inputImages.length > MAX_BANNER_UPLOAD_BATCH) throw new Error(`Mỗi lần chỉ tải tối đa ${MAX_BANNER_UPLOAD_BATCH} ảnh banner.`);
  const count = await context.env.DB.prepare("SELECT COUNT(*) AS total FROM site_banner_images").first();
  if (Number(count?.total || 0) + inputImages.length > MAX_BANNER_IMAGES) {
    throw new Error(`Banner chỉ lưu tối đa ${MAX_BANNER_IMAGES} ảnh. Hãy xóa bớt ảnh cũ trước.`);
  }
  const order = await context.env.DB.prepare("SELECT COALESCE(MAX(sort_order),0) AS maximum FROM site_banner_images").first();
  const baseOrder = Number(order?.maximum || 0);
  const now = Date.now();
  const uploaded = [];
  try {
    for (let index = 0; index < inputImages.length; index++) {
      const id = crypto.randomUUID();
      const key = `banner/${id}.jpg`;
      const bytes = base64Jpeg(inputImages[index]?.dataUrl, index);
      const caption = cleanText(inputImages[index]?.caption, 180, "chú thích banner");
      await context.env.MEDIA.put(key, bytes, { metadata: { contentType: "image/jpeg" } });
      uploaded.push({
        id,
        key,
        path: `/media/banner/${id}.jpg`,
        caption,
        sortOrder: baseOrder + ((index + 1) * 10),
      });
    }
    await context.env.DB.batch(uploaded.map((item) => context.env.DB.prepare(`
      INSERT INTO site_banner_images(id,path,storage_key,caption,sort_order,uploaded_by,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?)
    `).bind(item.id, item.path, item.key, item.caption, item.sortOrder, session.user.username, now, now)));
  } catch (error) {
    await Promise.all(uploaded.map((item) => context.env.MEDIA.delete(item.key).catch(() => {})));
    throw error;
  }
  return json({ ok: true, ...(await bannerData(context)) }, 201);
}

async function updateBannerSettings(context, session, input) {
  requirePermission(session, "manage-banner");
  assertCsrf(context, session);
  const intervalMs = normalizeBannerInterval(input?.intervalMs);
  await context.env.DB.prepare(`INSERT INTO site_banner_settings(id,interval_ms,updated_by,updated_at) VALUES(1,?,?,?)
    ON CONFLICT(id) DO UPDATE SET interval_ms=excluded.interval_ms,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
    .bind(intervalMs, session.user.username, Date.now()).run();
  return json({ ok: true, intervalMs });
}

async function deleteBannerImage(context, session, input) {
  requirePermission(session, "manage-banner");
  assertCsrf(context, session);
  const id = String(input?.id || "").trim();
  if (!/^[a-z0-9-]{8,80}$/i.test(id)) throw new Error("Mã ảnh banner không hợp lệ.");
  const row = await context.env.DB.prepare("SELECT storage_key FROM site_banner_images WHERE id=? LIMIT 1").bind(id).first();
  if (!row) throw new HttpError(404, "Không tìm thấy ảnh banner.");
  const result = await context.env.DB.prepare("DELETE FROM site_banner_images WHERE id=?").bind(id).run();
  if (Number(result.meta?.changes) !== 1) throw new HttpError(409, "Danh sách banner vừa thay đổi. Hãy tải lại trang.");
  if (row.storage_key) await context.env.MEDIA.delete(row.storage_key).catch(() => {});
  return json({ ok: true });
}

async function touchVisitor(context, input) {
  assertSameOrigin(context);
  const hash = await visitorHash(input);
  const now = Date.now();
  const existing = await context.env.DB.prepare("SELECT last_seen FROM active_visitors WHERE visitor_hash=?").bind(hash).first();
  const isNewVisit = !existing || Number(existing.last_seen) < now - VISIT_SESSION_MS;
  if (isNewVisit) {
    const day = dateKey(now);
    await context.env.DB.batch([
      context.env.DB.prepare(`INSERT INTO active_visitors(visitor_hash,started_at,last_seen) VALUES(?,?,?)
        ON CONFLICT(visitor_hash) DO UPDATE SET started_at=excluded.started_at,last_seen=excluded.last_seen`).bind(hash, now, now),
      context.env.DB.prepare(`INSERT INTO traffic_daily(day,visits,updated_at) VALUES(?,1,?)
        ON CONFLICT(day) DO UPDATE SET visits=traffic_daily.visits+1,updated_at=excluded.updated_at`).bind(day, now),
      context.env.DB.prepare("UPDATE traffic_totals SET total_visits=total_visits+1,updated_at=? WHERE id=1").bind(now),
    ]);
  } else {
    await context.env.DB.prepare("UPDATE active_visitors SET last_seen=? WHERE visitor_hash=?").bind(now, hash).run();
  }
  context.waitUntil(context.env.DB.prepare("DELETE FROM active_visitors WHERE last_seen<?").bind(now - 24 * 60 * 60 * 1000).run());
  return { hash, now, isNewVisit };
}

async function recordVisit(context, input) {
  const visit = await touchVisitor(context, input);
  return json({ ok: true, counted: visit.isNewVisit });
}

async function recordArticleView(context, input) {
  const visit = await touchVisitor(context, input);
  const path = String(input?.path || "").trim();
  const match = path.match(/^\/(hoat-dong|ky-nang)\/([a-z0-9-]{1,110})\/?$/);
  if (!match) throw new HttpError(400, "Đường dẫn bài viết không hợp lệ.");
  const normalizedPath = `/${match[1]}/${match[2]}/`;
  const contentType = match[1] === "hoat-dong" ? "event" : "skill";
  let title = "";
  const dynamic = await context.env.DB.prepare("SELECT title FROM posts WHERE type=? AND slug=? AND status='PUBLISHED' LIMIT 1")
    .bind(contentType, match[2]).first();
  if (dynamic?.title) {
    title = dynamic.title;
  } else {
    const staticResponse = await context.env.ASSETS.fetch(new Request(new URL(normalizedPath, context.request.url)));
    if (!staticResponse.ok) throw new HttpError(404, "Không tìm thấy bài viết công khai.");
    const html = await staticResponse.text();
    const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
    title = heading.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  }
  title = cleanText(title || input?.title, 180, "tiêu đề bài viết", true).replace(/\s+/g, " ");
  const key = await sha256(`article|${normalizedPath}`);
  const day = dateKey(visit.now);
  const dedup = await context.env.DB.prepare("INSERT OR IGNORE INTO article_view_dedup(article_key,visitor_hash,view_day,viewed_at) VALUES(?,?,?,?)")
    .bind(key, visit.hash, day, visit.now).run();
  if (Number(dedup.meta?.changes) === 1) {
    await context.env.DB.prepare(`INSERT INTO article_views(article_key,title,path,content_type,view_count,last_viewed_at) VALUES(?,?,?,?,1,?)
      ON CONFLICT(article_key) DO UPDATE SET title=excluded.title,path=excluded.path,content_type=excluded.content_type,
      view_count=article_views.view_count+1,last_viewed_at=excluded.last_viewed_at`)
      .bind(key, title, normalizedPath, contentType, visit.now).run();
  }
  context.waitUntil(context.env.DB.prepare("DELETE FROM article_view_dedup WHERE viewed_at<?").bind(visit.now - 45 * 24 * 60 * 60 * 1000).run());
  const row = await context.env.DB.prepare("SELECT view_count FROM article_views WHERE article_key=?").bind(key).first();
  return json({ ok: true, counted: Number(dedup.meta?.changes) === 1, views: Number(row?.view_count || 0) });
}

async function analyticsSummary(context) {
  const now = Date.now();
  const day = dateKey(now);
  const month = `${day.slice(0, 7)}-%`;
  const [total, today, currentMonth, online, popular] = await Promise.all([
    context.env.DB.prepare("SELECT total_visits AS total FROM traffic_totals WHERE id=1").first(),
    context.env.DB.prepare("SELECT visits AS total FROM traffic_daily WHERE day=?").bind(day).first(),
    context.env.DB.prepare("SELECT COALESCE(SUM(visits),0) AS total FROM traffic_daily WHERE day LIKE ?").bind(month).first(),
    context.env.DB.prepare("SELECT COUNT(*) AS total FROM active_visitors WHERE last_seen>=?").bind(now - ONLINE_WINDOW_MS).first(),
    context.env.DB.prepare("SELECT title,path,content_type,view_count FROM article_views ORDER BY view_count DESC,last_viewed_at DESC LIMIT 6").all(),
  ]);
  return json({
    ok: true,
    stats: {
      online: Number(online?.total || 0),
      today: Number(today?.total || 0),
      month: Number(currentMonth?.total || 0),
      total: Number(total?.total || 0),
    },
    popular: (popular.results || []).map((item) => ({
      title: item.title,
      path: item.path,
      type: item.content_type,
      views: Number(item.view_count || 0),
    })),
  }, 200, { "Cache-Control": "no-store" });
}

async function submitMessage(context, input) {
  assertSameOrigin(context);
  if (String(input?.website || "").trim()) return json({ ok: true });
  const hash = await visitorHash(input);
  const clientAddress = context.request.headers.get("CF-Connecting-IP") || hash;
  const rateHash = await sha256(`feedback-rate|${clientAddress}`);
  const content = cleanText(input?.content, 1500, "nội dung tin nhắn", true);
  if (content.length < 10) throw new Error("Tin nhắn cần ít nhất 10 ký tự.");
  const now = Date.now();
  const latest = await context.env.DB.prepare("SELECT created_at FROM feedback_messages WHERE visitor_hash=? ORDER BY created_at DESC LIMIT 1").bind(rateHash).first();
  if (latest && Number(latest.created_at) > now - MESSAGE_COOLDOWN_MS) {
    throw new HttpError(429, "Bạn vừa gửi tin nhắn. Vui lòng chờ một phút rồi thử lại.");
  }
  const daily = await context.env.DB.prepare("SELECT COUNT(*) AS total FROM feedback_messages WHERE visitor_hash=? AND created_at>=?")
    .bind(rateHash, now - 24 * 60 * 60 * 1000).first();
  if (Number(daily?.total || 0) >= 5) throw new HttpError(429, "Bạn đã gửi đủ số tin nhắn trong hôm nay.");
  await context.env.DB.prepare("INSERT INTO feedback_messages(id,content,visitor_hash,status,created_at,updated_at) VALUES(?,?,?,'NEW',?,?)")
    .bind(crypto.randomUUID(), content, rateHash, now, now).run();
  return json({ ok: true, message: "Tin nhắn đã được gửi tới quản trị viên." }, 201);
}

async function listMessages(context, session) {
  requirePermission(session, "manage-messages");
  const result = await context.env.DB.prepare("SELECT id,content,status,created_at,updated_at FROM feedback_messages ORDER BY CASE status WHEN 'NEW' THEN 0 ELSE 1 END,created_at DESC LIMIT 100").all();
  return json({ ok: true, messages: (result.results || []).map((item) => ({
    id: item.id,
    content: item.content,
    status: item.status,
    createdAt: new Date(Number(item.created_at)).toISOString(),
    updatedAt: new Date(Number(item.updated_at)).toISOString(),
  })) });
}

async function updateMessage(context, session, input, remove = false) {
  requirePermission(session, "manage-messages");
  assertCsrf(context, session);
  const id = String(input?.id || "").trim();
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Mã tin nhắn không hợp lệ.");
  const result = remove
    ? await context.env.DB.prepare("DELETE FROM feedback_messages WHERE id=?").bind(id).run()
    : await context.env.DB.prepare("UPDATE feedback_messages SET status='READ',updated_at=? WHERE id=?").bind(Date.now(), id).run();
  if (Number(result.meta?.changes) !== 1) throw new HttpError(404, "Không tìm thấy tin nhắn.");
  return json({ ok: true });
}

async function checkLive(context) {
  const session = await requireSession(context);
  if (session.user.mustChangePassword) throw new HttpError(403, "Bạn phải đổi mật khẩu tạm trước khi sử dụng cổng quản trị.");
  const raw = new URL(context.request.url).searchParams.get("url") || "";
  let slug = "";
  try { slug = decodeURIComponent(new URL(raw, origin(context)).pathname.split("/").filter(Boolean).pop() || ""); } catch (_) {}
  const row = slug ? await context.env.DB.prepare("SELECT status FROM posts WHERE slug=? ORDER BY updated_at DESC LIMIT 1").bind(slug).first() : null;
  return json({ ok: true, live: row?.status === "PUBLISHED" });
}

export async function onRequest(context) {
  try {
    if (!context.env.DB || !context.env.MEDIA) throw new HttpError(503, "Backend quản trị chưa được gắn cơ sở dữ liệu hoặc kho ảnh.");
    const path = routePath(context);
    const method = context.request.method.toUpperCase();
    if (path === "login" && method === "POST") return await login(context, await readJson(context.request));
    if (path === "logout" && method === "POST") return await logout(context);
    if (path === "public/posts" && method === "GET") return await publicPosts(context);
    if (path === "public/banner" && method === "GET") return await publicBanner(context);
    if (path === "analytics/summary" && method === "GET") return await analyticsSummary(context);
    if (path === "analytics/visit" && method === "POST") return await recordVisit(context, await readJson(context.request));
    if (path === "analytics/view" && method === "POST") return await recordArticleView(context, await readJson(context.request));
    if (path === "messages/submit" && method === "POST") return await submitMessage(context, await readJson(context.request));
    if (path === "check-live" && method === "GET") return await checkLive(context);

    const session = await requireSession(context);
    if (path === "config" && method === "GET") return await config(context, session);
    if (path === "change-password" && method === "POST") return await changePassword(context, session, await readJson(context.request));
    if (session.user.mustChangePassword) throw new HttpError(403, "Bạn phải đổi mật khẩu tạm trước khi sử dụng cổng quản trị.");
    if (path === "users" && method === "GET") return await listUsers(context, session);
    if (path === "users/update" && method === "POST") return await updateUser(context, session, await readJson(context.request));
    if (path === "users/reset-password" && method === "POST") return await resetPassword(context, session, await readJson(context.request));
    if (path === "messages" && method === "GET") return await listMessages(context, session);
    if (path === "messages/read" && method === "POST") return await updateMessage(context, session, await readJson(context.request));
    if (path === "messages/delete" && method === "POST") return await updateMessage(context, session, await readJson(context.request), true);
    if (path === "banner" && method === "GET") return await adminBanner(context, session);
    if (path === "banner/upload" && method === "POST") return await uploadBannerImages(context, session, await readJson(context.request));
    if (path === "banner/settings" && method === "POST") return await updateBannerSettings(context, session, await readJson(context.request));
    if (path === "banner/delete" && method === "POST") return await deleteBannerImage(context, session, await readJson(context.request));
    if (path === "create" && method === "POST") return await createPost(context, session, await readJson(context.request));
    if (path === "review" && method === "POST") return await submitReview(context, session);
    if (path === "approve-publish" && method === "POST") return await approveAndPublish(context, session);
    if (path === "publish" && method === "POST") return await publishApproved(context, session);
    if (path === "discard" && method === "POST") return await discard(context, session);
    throw new HttpError(404, "Không tìm thấy API.");
  } catch (error) {
    return errorResponse(error);
  }
}
