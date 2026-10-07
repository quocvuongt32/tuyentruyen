"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const base = String(process.env.TEST_BASE_URL || "http://127.0.0.1:57966").replace(/\/$/, "");
const credentialsText = fs.readFileSync(process.env.TEST_CREDENTIALS_PATH || path.join(root, ".publisher", "cloud-initial-credentials.txt"), "utf8");

function initialPassword(username) {
  const match = credentialsText.match(new RegExp(`^${username}\\s+(\\S+)$`, "m"));
  if (!match) throw new Error(`Không tìm thấy mật khẩu tạm của ${username}.`);
  return match[1];
}

async function request(url, options = {}) {
  const response = await fetch(`${base}${url}`, options);
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { data = null; }
  if (!response.ok) throw new Error(`${options.method || "GET"} ${url}: HTTP ${response.status} ${data?.error || text.slice(0, 300)}`);
  return { response, data, text };
}

async function login(username, password) {
  const result = await request("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  return { ...result.data, cookie: String(result.response.headers.get("set-cookie") || "").split(";")[0] };
}

async function changeTemporaryPassword(username, currentPassword, nextPassword) {
  const session = await login(username, currentPassword);
  if (!session.user.mustChangePassword) return session;
  const result = await request("/api/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: session.cookie, "X-Publisher-Token": session.csrfToken },
    body: JSON.stringify({ currentPassword, newPassword: nextPassword }),
  });
  return { ...session, ...result.data, user: result.data.user };
}

async function main() {
  const rejected = await fetch(`${base}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "sai-mat-khau" }) });
  assert.strictEqual(rejected.status, 401);
  const authorPassword = process.env.TEST_AUTHOR_PASSWORD || initialPassword("vuongnq");
  const approverPassword = process.env.TEST_APPROVER_PASSWORD || initialPassword("nganpt");
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || initialPassword("admin");
  const authorNext = process.env.TEST_AUTHOR_NEXT_PASSWORD || "AuthorCloudTest2026!";
  const approverNext = process.env.TEST_APPROVER_NEXT_PASSWORD || "ApproverCloudTest2026!";
  const adminNext = process.env.TEST_ADMIN_NEXT_PASSWORD || "AdminCloudTest2026!";
  const author = await changeTemporaryPassword("vuongnq", authorPassword, authorNext);
  const approver = await changeTemporaryPassword("nganpt", approverPassword, approverNext);
  const admin = await changeTemporaryPassword("admin", adminPassword, adminNext);
  const imagePath = process.env.TEST_IMAGE_PATH || path.join(root, "uploads", "banner-12.jpg");
  const dataUrl = `data:image/jpeg;base64,${fs.readFileSync(imagePath).toString("base64")}`;
  const idSuffix = Date.now().toString(36);
  const visitorToken = `cloud-test-${idSuffix}-anonymous-visitor`;
  const visit = await request("/api/analytics/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorToken }) });
  assert.strictEqual(visit.data.ok, true);
  const feedbackContent = `Tin nhắn kiểm thử hệ thống ${idSuffix}`;
  await request("/api/messages/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorToken, content: feedbackContent, website: "" }) });
  const adminHeaders = { "Content-Type": "application/json", Cookie: admin.cookie, "X-Publisher-Token": admin.csrfToken };
  const invalidUser = await fetch(`${base}/api/users/create`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ username: "!", fullName: "Tài khoản thử", role: "author", temporaryPassword: "TemporaryTest2026!" }) });
  assert.strictEqual(invalidUser.status, 400, "API tạo tài khoản chưa kiểm tra tên đăng nhập.");
  const siteTextFields = (await request("/api/site-texts", { headers: { Cookie: admin.cookie } })).data.fields;
  const siteText = siteTextFields.find((field) => field.key === "quiz.heading");
  assert(siteText, "Admin chưa tải được danh sách khối chữ Trang chủ.");
  const temporarySiteText = `${siteText.value} [kiểm thử]`;
  await request("/api/site-texts/update", { method: "POST", headers: adminHeaders, body: JSON.stringify({ texts: { [siteText.key]: temporarySiteText } }) });
  const publicSiteTexts = (await request("/api/public/site-texts")).data.fields;
  assert(publicSiteTexts.some((field) => field.key === siteText.key && field.value === temporarySiteText));
  await request("/api/site-texts/update", { method: "POST", headers: adminHeaders, body: JSON.stringify({ texts: { [siteText.key]: siteText.value } }) });
  const publicBannerBefore = (await request("/api/public/banner")).data;
  assert(publicBannerBefore.images.length >= 1, "Banner công khai chưa có danh sách ảnh ban đầu.");
  const adminBanner = (await request("/api/banner", { headers: { Cookie: admin.cookie } })).data;
  assert.strictEqual(adminBanner.images.length, publicBannerBefore.images.length);
  assert(adminBanner.maxImages >= adminBanner.images.length);
  const existingBannerIds = new Set(adminBanner.images.map((item) => item.id));
  const uploadedBanner = (await request("/api/banner/upload", { method: "POST", headers: adminHeaders, body: JSON.stringify({ images: [{ dataUrl, caption: "Ảnh kiểm thử banner" }] }) })).data;
  const addedBanner = uploadedBanner.images.find((item) => !existingBannerIds.has(item.id));
  assert(addedBanner?.uploaded, "Ảnh banner tải lên chưa xuất hiện trong cấu hình.");
  const bannerMedia = await fetch(`${base}${addedBanner.src}`);
  assert.strictEqual(bannerMedia.status, 200);
  assert.strictEqual(bannerMedia.headers.get("content-type"), "image/jpeg");
  await request("/api/banner/settings", { method: "POST", headers: adminHeaders, body: JSON.stringify({ intervalMs: 5000 }) });
  const publicBannerChanged = (await request("/api/public/banner")).data;
  assert.strictEqual(publicBannerChanged.intervalMs, 5000);
  assert(publicBannerChanged.images.some((item) => item.id === addedBanner.id));
  await request("/api/banner/delete", { method: "POST", headers: adminHeaders, body: JSON.stringify({ id: addedBanner.id }) });
  await request("/api/banner/settings", { method: "POST", headers: adminHeaders, body: JSON.stringify({ intervalMs: 4000 }) });
  const publicBannerAfter = (await request("/api/public/banner")).data;
  assert(!publicBannerAfter.images.some((item) => item.id === addedBanner.id));
  const messages = (await request("/api/messages", { headers: { Cookie: admin.cookie } })).data.messages;
  const feedback = messages.find((item) => item.content === feedbackContent);
  assert(feedback, "Tin nhắn góp ý chưa xuất hiện trong trang quản trị.");
  await request("/api/messages/read", { method: "POST", headers: adminHeaders, body: JSON.stringify({ id: feedback.id }) });
  const payload = {
    type: "event",
    title: `Bài kiểm thử cổng quản trị trực tuyến ${idSuffix}`,
    titleAlign: "justify",
    date: "2026-09-30",
    placement: "timeline",
    category: "an-ninh-mang",
    location: "Hà Nội",
    summary: "Bản thử nghiệm quy trình đăng bài, chèn ảnh và thẩm định trực tuyến.",
    summaryAlign: "justify",
    bodyBlocks: [
      { type: "heading2", html: "Nội dung <strong>kiểm thử</strong>", align: "left" },
      { type: "paragraph", html: "Đây là đoạn nội dung thường có đủ số lượng ký tự để xác minh toàn bộ quy trình.", align: "justify" },
      { type: "image", imageId: `img-inline-${idSuffix}`, caption: "Chú thích ảnh màu xanh lá" },
      { type: "paragraph", html: "Đoạn kết thúc sau ảnh minh họa.", align: "left" },
    ],
    images: [
      { id: `img-cover-${idSuffix}`, kind: "cover", caption: "Ảnh đại diện kiểm thử", dataUrl },
      { id: `img-inline-${idSuffix}`, kind: "inline", caption: "", dataUrl },
      { id: `img-gallery-${idSuffix}`, kind: "gallery", caption: "Ảnh tư liệu cuối bài", dataUrl },
    ],
    featuredBanner: false,
    link: "",
    video: "",
  };
  const authorHeaders = { "Content-Type": "application/json", Cookie: author.cookie, "X-Publisher-Token": author.csrfToken };
  const created = (await request("/api/create", { method: "POST", headers: authorHeaders, body: JSON.stringify(payload) })).data.post;
  assert.strictEqual(created.workflowStatus, "DRAFT");
  const reviewed = (await request("/api/review", { method: "POST", headers: authorHeaders, body: "{}" })).data.post;
  assert.strictEqual(reviewed.workflowStatus, "REVIEW");
  const hiddenPublicPosts = (await request("/api/public/posts?type=event")).data.posts;
  assert(!hiddenPublicPosts.some((item) => item.slug === reviewed.slug), "Bài đang chờ duyệt lọt vào API công khai.");
  const unauthenticatedPreview = await fetch(`${base}${reviewed.previewUrl}`);
  assert.strictEqual(unauthenticatedPreview.status, 401);
  const preview = await request(reviewed.previewUrl, { headers: { Cookie: author.cookie } });
  const mediaPathBeforePublish = preview.text.match(/\/media\/posts\/[a-f0-9-]{36}\/img-[a-zA-Z0-9-]{8,80}\.jpg/)?.[0];
  assert(mediaPathBeforePublish, "Bản xem trước thiếu ảnh đã tải lên.");
  assert.strictEqual((await fetch(`${base}${mediaPathBeforePublish}`)).status, 404, "Ảnh bản thảo đang bị công khai.");
  assert.strictEqual((await fetch(`${base}${mediaPathBeforePublish}`, { headers: { Cookie: author.cookie } })).status, 200);
  const approverHeaders = { "Content-Type": "application/json", Cookie: approver.cookie, "X-Publisher-Token": approver.csrfToken };
  const config = (await request("/api/config", { headers: { Cookie: approver.cookie } })).data;
  assert.strictEqual(config.pending.workflowStatus, "REVIEW");
  const published = (await request("/api/approve-publish", { method: "POST", headers: approverHeaders, body: "{}" })).data.post;
  assert.strictEqual(published.workflowStatus, "PUBLISHED");
  const publicPosts = (await request("/api/public/posts?type=event")).data.posts;
  const post = publicPosts.find((item) => item.slug === published.slug);
  assert(post, "Bài đã duyệt chưa xuất hiện trong API công khai.");
  const article = await request(new URL(published.url).pathname);
  assert(article.text.includes("Đại úy Nguyễn Quốc Vương"));
  assert(article.text.includes("Chú thích ảnh màu xanh lá"));
  assert(article.text.includes('class="text-align-justify"'));
  const mediaResponse = await fetch(`${base}${post.images[0].src}`);
  assert.strictEqual(mediaResponse.status, 200);
  assert.strictEqual(mediaResponse.headers.get("content-type"), "image/jpeg");
  const firstView = await request("/api/analytics/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorToken, path: new URL(published.url).pathname, title: post.title }) });
  const duplicateView = await request("/api/analytics/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorToken, path: new URL(published.url).pathname, title: post.title }) });
  assert.strictEqual(firstView.data.counted, true);
  assert.strictEqual(duplicateView.data.counted, false);
  const analytics = (await request("/api/analytics/summary")).data;
  assert(analytics.stats.total >= 1 && analytics.stats.today >= 1 && analytics.stats.month >= 1);
  assert(analytics.popular.some((item) => item.path === new URL(published.url).pathname));
  const managedBefore = (await request("/api/posts", { headers: { Cookie: admin.cookie } })).data.posts;
  assert(managedBefore.some((item) => item.slug === published.slug), "Bài đã đăng chưa xuất hiện trong danh sách quản trị.");
  const editable = (await request(`/api/posts/get?type=event&slug=${encodeURIComponent(published.slug)}`, { headers: { Cookie: admin.cookie } })).data.post;
  const editedTitle = `${editable.title} - đã sửa`;
  const updated = (await request("/api/posts/update", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      ...editable,
      title: editedTitle,
      titleAlign: "center",
      summaryAlign: "justify",
      images: editable.images.map((item) => ({ ...item, existingPath: item.path })),
    }),
  })).data.post;
  assert.strictEqual(updated.title, editedTitle);
  const editedArticle = await request(new URL(published.url).pathname);
  assert(editedArticle.text.includes('class="text-align-center"'));
  assert(editedArticle.text.includes(editedTitle));
  const managedAfter = (await request("/api/posts", { headers: { Cookie: admin.cookie } })).data.posts;
  await request("/api/posts/reorder", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ items: managedAfter.map((item) => ({ type: item.type, slug: item.slug })) }),
  });
  await request("/api/posts/delete", { method: "POST", headers: adminHeaders, body: JSON.stringify({ type: "event", slug: published.slug }) });
  assert.strictEqual((await fetch(`${base}${new URL(published.url).pathname}`)).status, 404);
  await request("/api/messages/delete", { method: "POST", headers: adminHeaders, body: JSON.stringify({ id: feedback.id }) });
  console.log(JSON.stringify({ wrongPassword: rejected.status, invalidNewUser: invalidUser.status, siteTextWorkflow: "LOAD → EDIT → RESTORE", created: created.workflowStatus, reviewed: reviewed.workflowStatus, draftMediaAnonymous: 404, published: published.workflowStatus, url: published.url, publicPosts: publicPosts.length, media: mediaResponse.status, traffic: analytics.stats, popularTracked: true, postManagement: "LIST → EDIT → REORDER → DELETE", messageWorkflow: "NEW → READ → DELETED", bannerWorkflow: "LIST → UPLOAD → SPEED → DELETE" }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
