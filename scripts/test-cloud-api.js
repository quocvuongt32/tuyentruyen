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
  const authorNext = process.env.TEST_AUTHOR_NEXT_PASSWORD || "AuthorCloudTest2026!";
  const approverNext = process.env.TEST_APPROVER_NEXT_PASSWORD || "ApproverCloudTest2026!";
  const author = await changeTemporaryPassword("vuongnq", authorPassword, authorNext);
  const approver = await changeTemporaryPassword("nganpt", approverPassword, approverNext);
  const imagePath = process.env.TEST_IMAGE_PATH || path.join(root, "uploads", "banner-12.jpg");
  const dataUrl = `data:image/jpeg;base64,${fs.readFileSync(imagePath).toString("base64")}`;
  const idSuffix = Date.now().toString(36);
  const payload = {
    type: "event",
    title: `Bài kiểm thử cổng quản trị trực tuyến ${idSuffix}`,
    date: "2026-09-30",
    placement: "timeline",
    category: "an-ninh-mang",
    location: "Hà Nội",
    summary: "Bản thử nghiệm quy trình đăng bài, chèn ảnh và thẩm định trực tuyến.",
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
  const mediaResponse = await fetch(`${base}${post.images[0].src}`);
  assert.strictEqual(mediaResponse.status, 200);
  assert.strictEqual(mediaResponse.headers.get("content-type"), "image/jpeg");
  console.log(JSON.stringify({ wrongPassword: rejected.status, created: created.workflowStatus, reviewed: reviewed.workflowStatus, draftMediaAnonymous: 404, published: published.workflowStatus, url: published.url, publicPosts: publicPosts.length, media: mediaResponse.status }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
