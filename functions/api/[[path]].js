import {
  CATEGORY_LABELS,
  HttpError,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  PASSWORD_ITERATIONS,
  SESSION_MAX_AGE_MS,
  assertCsrf,
  base64Jpeg,
  cleanAlignment,
  cleanText,
  cleanUrl,
  errorResponse,
  escapeHtml,
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
const SITE_TEXT_FIELDS = Object.freeze([
  { key: "brand.line1", group: "Nhận diện và menu", label: "Tên Cẩm nang - dòng 1", selector: "#brand-line1", defaultValue: "CẨM NANG -" },
  { key: "brand.line2", group: "Nhận diện và menu", label: "Tên Cẩm nang - dòng 2", selector: "#brand-line2", defaultValue: "AN TOÀN SỐ" },
  { key: "nav.home", group: "Nhận diện và menu", label: "Menu Trang chủ", selector: "#nav-trangchu", defaultValue: "Trang chủ" },
  { key: "nav.about", group: "Nhận diện và menu", label: "Menu Giới thiệu", selector: "#nav-gioithieu", defaultValue: "Giới thiệu" },
  { key: "nav.sources", group: "Nhận diện và menu", label: "Menu Nguồn tham khảo", selector: "#nav-nguonchinhthong", defaultValue: "Nguồn tham khảo" },
  { key: "nav.activities", group: "Nhận diện và menu", label: "Menu Tuyên truyền", selector: "#nav-tuyentruyen", defaultValue: "Tuyên truyền" },
  { key: "nav.other", group: "Nhận diện và menu", label: "Menu Hoạt động khác", selector: "#nav-hoatdongkhac", defaultValue: "Hoạt động khác" },
  { key: "nav.contact", group: "Nhận diện và menu", label: "Menu Liên hệ", selector: "#nav-lienhe", defaultValue: "Liên hệ" },

  { key: "hero.title", group: "Banner mở đầu", label: "Tiêu đề banner", selector: "#hero-title", defaultValue: "CẨM NANG AN TOÀN SỐ" },
  { key: "hero.subtitle", group: "Banner mở đầu", label: "Mô tả banner", selector: "#hero-subtitle", defaultValue: "Không gian tuyên truyền kỹ năng an ninh mạng và an toàn thông tin, đồng thời cập nhật hoạt động chuyển đổi số, đổi mới sáng tạo của Khoa Toán - Tin học và Ứng dụng KHCN trong phòng, chống tội phạm.", multiline: true, maxLength: 700 },
  { key: "hero.cta", group: "Banner mở đầu", label: "Nút trên banner", selector: "#hero-cta-text", defaultValue: "Xem Cẩm nang" },
  { key: "stats.activities", group: "Banner mở đầu", label: "Nhãn số hoạt động", selector: "#stat-label-activities", defaultValue: "Hoạt động" },
  { key: "stats.media", group: "Banner mở đầu", label: "Nhãn thư viện", selector: "#stat-label-media", defaultValue: "Thư viện ảnh & video" },
  { key: "stats.updated", group: "Banner mở đầu", label: "Nhãn cập nhật", selector: "#stat-label-updated", defaultValue: "Cập nhật gần nhất" },
  { key: "stats.visits", group: "Banner mở đầu", label: "Nhãn lượt truy cập", selector: "#stat-label-visits", defaultValue: "Lượt truy cập" },

  { key: "about.heading", group: "Giới thiệu", label: "Tiêu đề Giới thiệu", selector: "#about-heading", defaultValue: "Giới thiệu" },
  { key: "about.intro", group: "Giới thiệu", label: "Đoạn giới thiệu", selector: "#about-intro", defaultValue: "Khoa Toán - Tin học và Ứng dụng Khoa học công nghệ trong phòng, chống tội phạm tổ chức và tham gia nhiều hoạt động ứng dụng khoa học công nghệ, chuyển đổi số, đổi mới sáng tạo và tuyên truyền nâng cao nhận thức an toàn thông tin, góp phần xây dựng Học viện hiện đại, số hóa, thông minh.", multiline: true, maxLength: 1200 },
  { key: "about.partner1", group: "Giới thiệu", label: "Khối lãnh đạo của Đảng ủy", selector: "#about-partner-1", defaultValue: "Thực hiện dưới sự lãnh đạo của Đảng ủy Học viện Cảnh sát nhân dân", multiline: true, maxLength: 500 },
  { key: "about.partner2", group: "Giới thiệu", label: "Khối phối hợp lực lượng CAND", selector: "#about-partner-2", defaultValue: "Hoạt động tuyên truyền phối hợp cùng lực lượng Công an nhân dân", multiline: true, maxLength: 500 },
  { key: "about.directiveTitle", group: "Giới thiệu", label: "Tiêu đề căn cứ thực hiện", selector: "#about-directive-title", defaultValue: "Căn cứ thực hiện" },
  { key: "about.directive1", group: "Giới thiệu", label: "Căn cứ thực hiện số 1", selector: "#about-directive-1", defaultValue: "Nghị quyết số 57-NQ/TW (22/12/2024) của Bộ Chính trị về đột phá phát triển khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số quốc gia.", multiline: true, maxLength: 1000 },
  { key: "about.directive2", group: "Giới thiệu", label: "Căn cứ thực hiện số 2", selector: "#about-directive-2", defaultValue: "Nghị quyết số 879-NQ/ĐU (22/02/2023) của Đảng ủy Học viện CSND về lãnh đạo công tác ứng dụng khoa học công nghệ và chuyển đổi số tại Học viện CSND đến năm 2025, định hướng đến năm 2030.", multiline: true, maxLength: 1000 },
  { key: "about.directive3", group: "Giới thiệu", label: "Căn cứ thực hiện số 3", selector: "#about-directive-3", defaultValue: "Kết luận số 1249-KL/ĐU (13/7/2026) của Đảng ủy Học viện về tiếp tục đẩy mạnh thực hiện Nghị quyết số 879-NQ/ĐU và bổ sung các nhiệm vụ mới trong công tác ứng dụng khoa học công nghệ, chuyển đổi số.", multiline: true, maxLength: 1000 },

  { key: "sources.kicker", group: "Nguồn tham khảo", label: "Dòng nhỏ", selector: "#official-sources-kicker", defaultValue: "NGUỒN THAM KHẢO" },
  { key: "sources.heading", group: "Nguồn tham khảo", label: "Tiêu đề lớn", selector: "#official-sources-heading", defaultValue: "Cổng thông tin và nguồn tham khảo" },
  { key: "sources.hint", group: "Nguồn tham khảo", label: "Đoạn giới thiệu nguồn", selector: "#official-sources-hint", defaultValue: "Liên kết trực tiếp tới Cổng Thông tin điện tử Bộ Công an, chuyên trang của Cục A05 và Cổng Thông tin điện tử Học viện CSND. Website không tự động lấy hoặc đăng lại nội dung từ các nguồn này.", multiline: true, maxLength: 1000 },
  { key: "sources.1.name", group: "Nguồn tham khảo", label: "Tên nguồn Bộ Công an", selector: "#official-source-1-name", defaultValue: "Cổng Thông tin điện tử Bộ Công an" },
  { key: "sources.1.description", group: "Nguồn tham khảo", label: "Mô tả nguồn Bộ Công an", selector: "#official-source-1-description", defaultValue: "Thông tin chính thức, văn bản và hoạt động thuộc phạm vi quản lý của Bộ Công an.", multiline: true, maxLength: 700 },
  { key: "sources.2.name", group: "Nguồn tham khảo", label: "Tên nguồn A05", selector: "#official-source-2-name", defaultValue: "Cục An ninh mạng và phòng, chống tội phạm sử dụng công nghệ cao (A05)" },
  { key: "sources.2.description", group: "Nguồn tham khảo", label: "Mô tả nguồn A05", selector: "#official-source-2-description", defaultValue: "Chuyên trang chính thức của Cục A05 trên Cổng Thông tin điện tử Bộ Công an.", multiline: true, maxLength: 700 },
  { key: "sources.3.name", group: "Nguồn tham khảo", label: "Tên nguồn Học viện CSND", selector: "#official-source-3-name", defaultValue: "Cổng Thông tin điện tử Học viện CSND" },
  { key: "sources.3.description", group: "Nguồn tham khảo", label: "Mô tả nguồn Học viện CSND", selector: "#official-source-3-description", defaultValue: "Thông tin chính thức về đào tạo, nghiên cứu khoa học và hoạt động của Học viện Cảnh sát nhân dân.", multiline: true, maxLength: 700 },

  { key: "timeline.heading", group: "Các khu vực nội dung", label: "Tiêu đề Tuyên truyền", selector: "#timeline-heading", defaultValue: "Tuyên truyền An ninh mạng" },
  { key: "timeline.hint", group: "Các khu vực nội dung", label: "Mô tả Tuyên truyền", selector: "#timeline-hint", defaultValue: "Bấm vào từng mốc để xem/ẩn chi tiết, ảnh minh chứng và video.", multiline: true, maxLength: 600 },
  { key: "popular.kicker", group: "Các khu vực nội dung", label: "Dòng nhỏ Góc quan tâm", selector: "#popular-kicker", defaultValue: "Góc được quan tâm" },
  { key: "popular.heading", group: "Các khu vực nội dung", label: "Tiêu đề bài xem nhiều", selector: "#popular-heading", defaultValue: "Bài được xem nhiều nhất" },
  { key: "activity.heading", group: "Các khu vực nội dung", label: "Tiêu đề Hoạt động", selector: "#activity-heading", defaultValue: "Hoạt động của Khoa" },
  { key: "activity.hint", group: "Các khu vực nội dung", label: "Mô tả Hoạt động", selector: "#activity-hint", defaultValue: "Nội dung do Khoa Toán - Tin học và Ứng dụng KHCN trong PCTP biên soạn, quản lý hoặc được giao thực hiện.", multiline: true, maxLength: 700 },
  { key: "skills.heading", group: "Các khu vực nội dung", label: "Tiêu đề Bộ kỹ năng", selector: "#skills-heading", defaultValue: "Bộ kỹ năng An toàn số" },
  { key: "skills.hint", group: "Các khu vực nội dung", label: "Mô tả Bộ kỹ năng", selector: "#skills-hint", defaultValue: "Ảnh, infographic về các phương thức, thủ đoạn lừa đảo và cách phòng ngừa dành cho công dân. Bấm vào ảnh để xem cỡ lớn.", multiline: true, maxLength: 700 },
  { key: "skills.subheading", group: "Các khu vực nội dung", label: "Tiêu đề Infographic", selector: "#skills-subheading", defaultValue: "Infographic kỹ năng" },
  { key: "quiz.heading", group: "Các khu vực nội dung", label: "Tiêu đề Kiểm tra nhanh", selector: "#quiz-heading", defaultValue: "Kiểm tra nhanh: Bạn đã an toàn số chưa?" },
  { key: "quiz.hint", group: "Các khu vực nội dung", label: "Mô tả Kiểm tra nhanh", selector: "#quiz-hint", defaultValue: "6 câu hỏi trắc nghiệm ngắn giúp bạn tự đánh giá kỹ năng an toàn số đã học ở trên. Chọn đáp án rồi bấm “Xem kết quả” để biết đúng/sai kèm giải thích.", multiline: true, maxLength: 700 },

  { key: "feedback.kicker", group: "Liên hệ và thống kê", label: "Dòng nhỏ Gửi tin nhắn", selector: "#feedback-kicker", defaultValue: "Kết nối với Cẩm nang" },
  { key: "feedback.heading", group: "Liên hệ và thống kê", label: "Tiêu đề Gửi tin nhắn", selector: "#feedback-heading", defaultValue: "Gửi tin nhắn" },
  { key: "feedback.placeholder", group: "Liên hệ và thống kê", label: "Gợi ý trong ô tin nhắn", selector: "#feedback-content", attribute: "placeholder", defaultValue: "Nhập nội dung góp ý…" },
  { key: "traffic.kicker", group: "Liên hệ và thống kê", label: "Dòng nhỏ Thống kê", selector: "#traffic-kicker", defaultValue: "Số liệu trực tiếp" },
  { key: "traffic.heading", group: "Liên hệ và thống kê", label: "Tiêu đề Thống kê", selector: "#traffic-heading", defaultValue: "Thống kê truy cập" },
]);
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

async function createUser(context, session, input) {
  requirePermission(session, "manage-users");
  assertCsrf(context, session);
  const username = String(input.username || "").trim().toLowerCase();
  if (!/^[a-z][a-z0-9._-]{2,31}$/.test(username)) {
    throw new Error("Tên đăng nhập cần 3–32 ký tự, bắt đầu bằng chữ cái và chỉ dùng chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.");
  }
  if (await userByName(context.env, username)) throw new Error("Tên đăng nhập đã tồn tại.");
  const fullName = cleanText(input.fullName, 160, "họ tên", true).replace(/\s+/g, " ");
  const role = ["admin", "author", "approver"].includes(input.role) ? input.role : "author";
  const value = validatePassword(input.temporaryPassword);
  const salt = randomToken(18);
  const hash = await passwordHash(value, salt, PASSWORD_ITERATIONS);
  await context.env.DB.prepare(`INSERT INTO users(username,full_name,role,active,must_change_password,salt,password_hash,iterations,updated_at)
    VALUES(?,?,?,1,1,?,?,?,?)`).bind(username, fullName, role, salt, hash, PASSWORD_ITERATIONS, Date.now()).run();
  return json({ ok: true, user: publicUser(await userByName(context.env, username)) }, 201);
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

async function storedSiteTexts(env) {
  const result = await env.DB.prepare("SELECT text_key,text_value FROM site_text_overrides").all();
  return new Map((result.results || []).map((item) => [item.text_key, item.text_value]));
}

async function siteTextPayload(env) {
  const stored = await storedSiteTexts(env);
  return SITE_TEXT_FIELDS.map((field) => ({
    ...field,
    value: stored.has(field.key) ? stored.get(field.key) : field.defaultValue,
    customized: stored.has(field.key),
  }));
}

async function publicSiteTexts(context) {
  return json({ ok: true, fields: (await siteTextPayload(context.env)).filter((field) => field.customized) }, 200, { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" });
}

async function adminSiteTexts(context, session) {
  requirePermission(session, "manage-site-texts");
  return json({ ok: true, fields: await siteTextPayload(context.env) });
}

async function updateSiteTexts(context, session, input) {
  requirePermission(session, "manage-site-texts");
  assertCsrf(context, session);
  const values = input?.texts && typeof input.texts === "object" && !Array.isArray(input.texts) ? input.texts : {};
  const allowed = new Map(SITE_TEXT_FIELDS.map((field) => [field.key, field]));
  const requested = Object.entries(values);
  if (!requested.length || requested.length > SITE_TEXT_FIELDS.length) throw new Error("Danh sách nội dung cần lưu không hợp lệ.");
  const now = Date.now();
  const statements = requested.map(([key, rawValue]) => {
    const field = allowed.get(key);
    if (!field) throw new Error("Có khu vực chữ không được phép chỉnh sửa.");
    const value = cleanText(rawValue, field.maxLength || 300, field.label, true).replace(/\s+/g, " ");
    if (value === field.defaultValue) return context.env.DB.prepare("DELETE FROM site_text_overrides WHERE text_key=?").bind(key);
    return context.env.DB.prepare(`INSERT INTO site_text_overrides(text_key,text_value,updated_by,updated_at) VALUES(?,?,?,?)
      ON CONFLICT(text_key) DO UPDATE SET text_value=excluded.text_value,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
      .bind(key, value, session.user.username, now);
  });
  await context.env.DB.batch(statements);
  return json({ ok: true, fields: await siteTextPayload(context.env) });
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
  const titleAlign = cleanAlignment(input.titleAlign);
  const summaryAlign = cleanAlignment(input.summaryAlign);
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
      id,type,slug,title,summary,title_align,summary_align,publish_date,placement,category,location,series,sort_order,body_blocks_json,body_html,body_text,
      author_username,author_name,images_json,reference_link,video_url,featured,status,created_at,updated_at,revision_history_json
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      postId, type, slug, title, summary, titleAlign, summaryAlign, publishDate, placement, category,
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

async function readAssetJson(context, pathname, fallback) {
  try {
    const response = await context.env.ASSETS.fetch(new Request(new URL(pathname, context.request.url)));
    return response.ok ? await response.json() : fallback;
  } catch (_) {
    return fallback;
  }
}

function staticImages(item) {
  const values = Array.isArray(item?.images) ? item.images : [];
  const images = values.map((entry, index) => {
    const value = typeof entry === "string" ? { src: entry } : entry || {};
    return {
      id: `static-${index + 1}`,
      kind: value.role === "cover" ? "cover" : "gallery",
      path: value.src || value.image || "",
      caption: value.caption || "",
      key: "",
    };
  }).filter((entry) => /^\/(?:uploads|img)\//.test(entry.path));
  if (item?.image && !images.some((entry) => entry.path === item.image)) {
    images.unshift({ id: "static-cover", kind: "cover", path: item.image, caption: "", key: "" });
  }
  if (images.length && !images.some((entry) => entry.kind === "cover")) images[0].kind = "cover";
  return images;
}

function normalizeStaticPost(item, type) {
  return {
    id: "",
    type,
    slug: item.slug,
    title: item.title || "",
    titleAlign: cleanAlignment(item.titleAlign),
    summary: item.summary || "",
    summaryAlign: cleanAlignment(item.summaryAlign),
    date: item.date || "",
    placement: item.placement || (type === "event" && item.category === "an-ninh-mang" ? "timeline" : "activity"),
    category: item.category || "khac",
    categoryLabel: item.categoryLabel || CATEGORY_LABELS[item.category] || CATEGORY_LABELS.khac,
    location: item.location || "",
    series: item.series || "",
    order: item.order || null,
    bodyHtml: item.bodyHtml || (item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""),
    author: item.author || "",
    images: staticImages(item),
    link: item.link || "",
    videoUrl: item.videoUrl || "",
    featured: item.featured === true,
    source: "static",
    pageUrl: `/${type === "skill" ? "ky-nang" : "hoat-dong"}/${encodeURIComponent(item.slug)}/`,
  };
}

async function staticPublishedPosts(context) {
  const [eventPayload, skillPayload] = await Promise.all([
    readAssetJson(context, "/data/events.json", { events: [] }),
    readAssetJson(context, "/data/skills.json", { skills: [] }),
  ]);
  return [
    ...(Array.isArray(eventPayload.events) ? eventPayload.events.map((item) => normalizeStaticPost(item, "event")) : []),
    ...(Array.isArray(skillPayload.skills) ? skillPayload.skills.map((item) => normalizeStaticPost(item, "skill")) : []),
  ].filter((item) => item.slug && item.title);
}

function postKey(type, slug) {
  return `${type}:${slug}`;
}

async function postControls(env, type = "") {
  const result = type === "event" || type === "skill"
    ? await env.DB.prepare("SELECT * FROM published_post_controls WHERE type=?").bind(type).all()
    : await env.DB.prepare("SELECT * FROM published_post_controls").all();
  return result.results || [];
}

function applyPublishedControl(post, control) {
  const value = control?.display_order;
  return { ...post, displayOrder: value !== null && value !== undefined && Number.isInteger(Number(value)) ? Number(value) : null };
}

async function publicPosts(context) {
  const type = new URL(context.request.url).searchParams.get("type");
  const where = type === "event" || type === "skill" ? " AND type = ?" : "";
  const statement = context.env.DB.prepare(`SELECT * FROM posts WHERE status='PUBLISHED'${where} ORDER BY publish_date DESC, published_at DESC LIMIT 100`);
  const [result, controls] = await Promise.all([
    where ? statement.bind(type).all() : statement.all(),
    postControls(context.env, type),
  ]);
  const controlMap = new Map(controls.map((item) => [postKey(item.type, item.slug), item]));
  const posts = (result.results || [])
    .filter((row) => Number(controlMap.get(postKey(row.type, row.slug))?.hidden || 0) !== 1)
    .map((row) => applyPublishedControl(publicPostFromRow(row), controlMap.get(postKey(row.type, row.slug))));
  return json({
    ok: true,
    posts,
    controls: controls.map((item) => ({ type: item.type, slug: item.slug, displayOrder: item.display_order, hidden: Number(item.hidden) === 1 })),
  }, 200, { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" });
}

function parseStoredJson(value, fallback) {
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

function adminPostFromRow(row) {
  const post = publicPostFromRow(row);
  return {
    ...post,
    source: "cloud",
    images: parseStoredJson(row.images_json, []).map((item) => ({
      id: item.id,
      kind: item.kind,
      path: item.path,
      key: item.key || "",
      caption: item.caption || "",
    })),
    bodyBlocks: parseStoredJson(row.body_blocks_json, []),
    bodyHtml: post.bodyHtml,
    author: row.author_name,
  };
}

async function combinedPublishedPosts(context) {
  const [database, staticPosts, controls] = await Promise.all([
    context.env.DB.prepare("SELECT * FROM posts WHERE status='PUBLISHED' ORDER BY publish_date DESC,published_at DESC").all(),
    staticPublishedPosts(context),
    postControls(context.env),
  ]);
  const controlMap = new Map(controls.map((item) => [postKey(item.type, item.slug), item]));
  const databasePosts = (database.results || []).map(adminPostFromRow);
  const managed = new Set(databasePosts.map((item) => postKey(item.type, item.slug)));
  const combined = [...databasePosts, ...staticPosts.filter((item) => !managed.has(postKey(item.type, item.slug)))];
  return combined
    .filter((item) => Number(controlMap.get(postKey(item.type, item.slug))?.hidden || 0) !== 1)
    .map((item) => applyPublishedControl(item, controlMap.get(postKey(item.type, item.slug))))
    .sort((left, right) => {
      if (left.type !== right.type) return left.type.localeCompare(right.type);
      const leftOrder = Number.isInteger(left.displayOrder) ? left.displayOrder : Number.MAX_SAFE_INTEGER;
      const rightOrder = Number.isInteger(right.displayOrder) ? right.displayOrder : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || String(right.date).localeCompare(String(left.date), "en") || left.title.localeCompare(right.title, "vi");
    });
}

async function listPublishedPosts(context, session) {
  requirePermission(session, "manage-posts");
  const posts = (await combinedPublishedPosts(context)).map((item) => ({
    type: item.type,
    slug: item.slug,
    title: item.title,
    date: item.date,
    categoryLabel: item.categoryLabel,
    source: item.source,
    displayOrder: item.displayOrder,
    pageUrl: item.pageUrl,
    image: item.image || item.images?.find((image) => image.kind === "cover")?.path || item.images?.[0]?.path || "",
  }));
  return json({ ok: true, posts });
}

async function getPublishedPost(context, session) {
  requirePermission(session, "manage-posts");
  const url = new URL(context.request.url);
  const type = url.searchParams.get("type");
  const slug = url.searchParams.get("slug") || "";
  if (!['event', 'skill'].includes(type) || !slug) throw new Error("Bài viết không hợp lệ.");
  const row = await context.env.DB.prepare("SELECT * FROM posts WHERE type=? AND slug=? AND status='PUBLISHED' LIMIT 1").bind(type, slug).first();
  if (row) return json({ ok: true, post: adminPostFromRow(row) });
  const post = (await staticPublishedPosts(context)).find((item) => item.type === type && item.slug === slug);
  if (!post) throw new HttpError(404, "Không tìm thấy bài đã đăng.");
  return json({ ok: true, post });
}

function collectBodyImagePaths(html) {
  return [...String(html || "").matchAll(/\bsrc=["'](\/(?:media|uploads|img)\/[^"']+)["']/gi)].map((match) => match[1]);
}

async function updatePublishedPost(context, session, input) {
  requirePermission(session, "manage-posts");
  assertCsrf(context, session);
  const type = input.type === "event" || input.type === "skill" ? input.type : "";
  const slug = cleanText(input.slug, 120, "đường dẫn", true);
  const existingRow = await context.env.DB.prepare("SELECT * FROM posts WHERE type=? AND slug=? AND status='PUBLISHED' LIMIT 1").bind(type, slug).first();
  const staticPost = (await staticPublishedPosts(context)).find((item) => item.type === type && item.slug === slug);
  if (!existingRow && !staticPost) throw new HttpError(404, "Không tìm thấy bài đã đăng.");
  const current = existingRow ? adminPostFromRow(existingRow) : staticPost;
  const title = cleanText(input.title, 180, "tiêu đề", true);
  const summary = cleanText(input.summary, 320, "tóm tắt", true);
  const titleAlign = cleanAlignment(input.titleAlign);
  const summaryAlign = cleanAlignment(input.summaryAlign);
  const publishDate = cleanText(input.date, 10, "ngày đăng", true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) throw new Error("Ngày đăng phải theo định dạng YYYY-MM-DD.");
  const placement = type === "event" && input.placement === "activity" ? "activity" : "timeline";
  let category = Object.hasOwn(CATEGORY_LABELS, input.category) ? input.category : "khac";
  if (type === "event" && placement === "timeline") category = "an-ninh-mang";

  const existingImages = Array.isArray(current.images) ? current.images : [];
  const allowedPaths = new Set([
    ...existingImages.map((item) => item.path || item.src).filter(Boolean),
    ...collectBodyImagePaths(current.bodyHtml),
  ]);
  const oldImageByPath = new Map(existingImages.map((item) => [item.path || item.src, item]));
  const submitted = Array.isArray(input.images) ? input.images : [];
  if (submitted.length > MAX_IMAGES) throw new Error(`Mỗi bài tối đa ${MAX_IMAGES} ảnh.`);
  const ids = new Set();
  const postId = existingRow?.id || crypto.randomUUID();
  const uploaded = [];
  const media = [];
  try {
    for (let index = 0; index < submitted.length; index++) {
      const item = submitted[index] || {};
      const id = /^img-[a-zA-Z0-9-]{8,80}$/.test(String(item.id || "")) ? item.id : `img-${crypto.randomUUID()}`;
      if (ids.has(id)) throw new Error("Danh sách ảnh có mã bị trùng.");
      ids.add(id);
      const kind = ["cover", "gallery", "inline"].includes(item.kind) ? item.kind : index ? "gallery" : "cover";
      const caption = cleanText(item.caption, 260, "chú thích ảnh");
      const existingPath = String(item.existingPath || "");
      if (existingPath) {
        if (!allowedPaths.has(existingPath)) throw new Error("Ảnh hiện có không thuộc bài đang sửa.");
        const stored = oldImageByPath.get(existingPath);
        media.push({ id, kind, caption, key: stored?.key || "", path: existingPath });
      } else {
        const bytes = base64Jpeg(item.dataUrl, index);
        const key = `posts/${postId}/${id}.jpg`;
        await context.env.MEDIA.put(key, bytes, { metadata: { contentType: "image/jpeg" } });
        uploaded.push(key);
        media.push({ id, kind, caption, key, path: `/media/posts/${postId}/${id}.jpg` });
      }
    }
    if (media.length && !media.some((item) => item.kind === "cover")) {
      const firstGallery = media.find((item) => item.kind === "gallery");
      if (firstGallery) firstGallery.kind = "cover";
    }
    let coverSeen = false;
    media.forEach((item) => { if (item.kind === "cover") { if (coverSeen) item.kind = "gallery"; else coverSeen = true; } });
    const imagePaths = new Map(media.map((item) => [item.id, item.path]));
    const blocks = normalizeBlocks(input.bodyBlocks, imagePaths);
    const bodyText = cleanText(plainTextFromBlocks(blocks), 30_000, "nội dung", true);
    if (bodyText.length < 30) throw new Error("Nội dung cần ít nhất 30 ký tự.");
    const bodyHtml = renderBlocks(blocks);
    const now = Date.now();
    const authorName = current.author || session.user.fullName;
    const history = existingRow ? parseStoredJson(existingRow.revision_history_json, []) : [];
    history.push({ status: "PUBLISHED", actor: session.user.fullName, username: session.user.username, at: new Date(now).toISOString(), note: "Quản trị viên chỉnh sửa bài đã đăng" });
    const values = [
      title, summary, titleAlign, summaryAlign, publishDate, placement, category,
      type === "event" ? cleanText(input.location, 220, "địa điểm") : "",
      type === "skill" ? cleanText(input.series, 160, "tên chuỗi") : "",
      type === "skill" && Number.isInteger(Number(input.order)) && Number(input.order) > 0 ? Number(input.order) : null,
      JSON.stringify(blocks), bodyHtml, bodyText, authorName, JSON.stringify(media),
      type === "event" ? cleanUrl(input.link, "Link tham khảo") : "",
      type === "event" ? cleanUrl(input.video, "Link video") : "",
      input.featuredBanner === true ? 1 : 0, now, JSON.stringify(history),
    ];
    if (existingRow) {
      await context.env.DB.prepare(`UPDATE posts SET title=?,summary=?,title_align=?,summary_align=?,publish_date=?,placement=?,category=?,location=?,series=?,sort_order=?,body_blocks_json=?,body_html=?,body_text=?,author_name=?,images_json=?,reference_link=?,video_url=?,featured=?,updated_at=?,revision_history_json=? WHERE id=? AND status='PUBLISHED'`)
        .bind(...values, existingRow.id).run();
    } else {
      await context.env.DB.prepare(`INSERT INTO posts(id,type,slug,title,summary,title_align,summary_align,publish_date,placement,category,location,series,sort_order,body_blocks_json,body_html,body_text,author_username,author_name,images_json,reference_link,video_url,featured,status,published_by,published_username,published_at,created_at,updated_at,revision_history_json)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'PUBLISHED',?,?,?,?,?,?)`)
        .bind(postId, type, slug, title, summary, titleAlign, summaryAlign, publishDate, placement, category, values[7], values[8], values[9], values[10], values[11], values[12], session.user.username, authorName, values[14], values[15], values[16], values[17], session.user.fullName, session.user.username, now, now, now, values[19]).run();
    }
    await context.env.DB.prepare(`INSERT INTO published_post_controls(type,slug,hidden,updated_by,updated_at) VALUES(?,?,0,?,?)
      ON CONFLICT(type,slug) DO UPDATE SET hidden=0,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
      .bind(type, slug, session.user.username, now).run();
    const retainedKeys = new Set(media.map((item) => item.key).filter(Boolean));
    await Promise.all(existingImages.map((item) => item.key).filter((key) => key && !retainedKeys.has(key)).map((key) => context.env.MEDIA.delete(key).catch(() => {})));
    const updated = await context.env.DB.prepare("SELECT * FROM posts WHERE id=?").bind(postId).first();
    return json({ ok: true, post: adminPostFromRow(updated) });
  } catch (error) {
    await Promise.all(uploaded.map((key) => context.env.MEDIA.delete(key).catch(() => {})));
    throw error;
  }
}

async function deletePublishedPost(context, session, input) {
  requirePermission(session, "manage-posts");
  assertCsrf(context, session);
  const type = input.type === "event" || input.type === "skill" ? input.type : "";
  const slug = cleanText(input.slug, 120, "đường dẫn", true);
  const row = await context.env.DB.prepare("SELECT * FROM posts WHERE type=? AND slug=? AND status='PUBLISHED' LIMIT 1").bind(type, slug).first();
  const existsStatic = (await staticPublishedPosts(context)).some((item) => item.type === type && item.slug === slug);
  if (!row && !existsStatic) throw new HttpError(404, "Không tìm thấy bài đã đăng.");
  const now = Date.now();
  const statements = [context.env.DB.prepare(`INSERT INTO published_post_controls(type,slug,display_order,hidden,updated_by,updated_at) VALUES(?,?,NULL,1,?,?)
    ON CONFLICT(type,slug) DO UPDATE SET hidden=1,updated_by=excluded.updated_by,updated_at=excluded.updated_at`).bind(type, slug, session.user.username, now)];
  if (row) statements.unshift(context.env.DB.prepare("DELETE FROM posts WHERE id=? AND status='PUBLISHED'").bind(row.id));
  await context.env.DB.batch(statements);
  const images = row ? parseStoredJson(row.images_json, []) : [];
  await Promise.all(images.map((item) => item.key).filter(Boolean).map((key) => context.env.MEDIA.delete(key).catch(() => {})));
  return json({ ok: true });
}

async function reorderPublishedPosts(context, session, input) {
  requirePermission(session, "manage-posts");
  assertCsrf(context, session);
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length || items.length > 200) throw new Error("Danh sách sắp xếp không hợp lệ.");
  const valid = new Set((await combinedPublishedPosts(context)).map((item) => postKey(item.type, item.slug)));
  const seen = new Set();
  const now = Date.now();
  const statements = items.map((item, index) => {
    const type = item?.type === "event" || item?.type === "skill" ? item.type : "";
    const slug = String(item?.slug || "");
    const key = postKey(type, slug);
    if (!valid.has(key) || seen.has(key)) throw new Error("Danh sách sắp xếp chứa bài không hợp lệ hoặc bị trùng.");
    seen.add(key);
    return context.env.DB.prepare(`INSERT INTO published_post_controls(type,slug,display_order,hidden,updated_by,updated_at) VALUES(?,?,?,0,?,?)
      ON CONFLICT(type,slug) DO UPDATE SET display_order=excluded.display_order,hidden=0,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
      .bind(type, slug, index + 1, session.user.username, now);
  });
  await context.env.DB.batch(statements);
  return json({ ok: true });
}

async function publicWeather(context) {
  const cacheKey = new Request(new URL("/api/weather", context.request.url), { method: "GET" });
  const edgeCache = globalThis.caches?.default;
  const cached = edgeCache ? await edgeCache.match(cacheKey) : null;
  if (cached) return cached;

  const endpoint = new URL("https://api.open-meteo.com/v1/forecast");
  endpoint.searchParams.set("latitude", "21.0285");
  endpoint.searchParams.set("longitude", "105.8542");
  endpoint.searchParams.set("current", "temperature_2m,weather_code");
  endpoint.searchParams.set("timezone", "Asia/Bangkok");
  const upstream = await fetch(endpoint.toString(), { headers: { Accept: "application/json" } });
  if (!upstream.ok) throw new HttpError(502, "Tạm thời chưa lấy được dữ liệu thời tiết.");
  const payload = await upstream.json();
  const temperature = Number(payload?.current?.temperature_2m);
  const weatherCode = Number(payload?.current?.weather_code);
  if (!Number.isFinite(temperature) || !Number.isFinite(weatherCode)) {
    throw new HttpError(502, "Dữ liệu thời tiết trả về chưa hợp lệ.");
  }

  const response = json({
    ok: true,
    location: "Hà Nội",
    temperature,
    weatherCode,
    observedAt: String(payload?.current?.time || ""),
    source: "Open-Meteo",
  }, 200, { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800" });
  if (edgeCache) context.waitUntil(edgeCache.put(cacheKey, response.clone()));
  return response;
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
    const path = routePath(context);
    const method = context.request.method.toUpperCase();
    if (path === "weather" && method === "GET") return await publicWeather(context);
    if (!context.env.DB || !context.env.MEDIA) throw new HttpError(503, "Backend quản trị chưa được gắn cơ sở dữ liệu hoặc kho ảnh.");
    if (path === "login" && method === "POST") return await login(context, await readJson(context.request));
    if (path === "logout" && method === "POST") return await logout(context);
    if (path === "public/posts" && method === "GET") return await publicPosts(context);
    if (path === "public/banner" && method === "GET") return await publicBanner(context);
    if (path === "public/site-texts" && method === "GET") return await publicSiteTexts(context);
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
    if (path === "users/create" && method === "POST") return await createUser(context, session, await readJson(context.request));
    if (path === "users/update" && method === "POST") return await updateUser(context, session, await readJson(context.request));
    if (path === "users/reset-password" && method === "POST") return await resetPassword(context, session, await readJson(context.request));
    if (path === "messages" && method === "GET") return await listMessages(context, session);
    if (path === "messages/read" && method === "POST") return await updateMessage(context, session, await readJson(context.request));
    if (path === "messages/delete" && method === "POST") return await updateMessage(context, session, await readJson(context.request), true);
    if (path === "site-texts" && method === "GET") return await adminSiteTexts(context, session);
    if (path === "site-texts/update" && method === "POST") return await updateSiteTexts(context, session, await readJson(context.request));
    if (path === "posts" && method === "GET") return await listPublishedPosts(context, session);
    if (path === "posts/get" && method === "GET") return await getPublishedPost(context, session);
    if (path === "posts/update" && method === "POST") return await updatePublishedPost(context, session, await readJson(context.request));
    if (path === "posts/delete" && method === "POST") return await deletePublishedPost(context, session, await readJson(context.request));
    if (path === "posts/reorder" && method === "POST") return await reorderPublishedPosts(context, session, await readJson(context.request));
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
