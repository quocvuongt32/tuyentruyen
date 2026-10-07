"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const errors = [];

function requireFile(rel) {
  if (!fs.existsSync(path.join(dist, rel))) errors.push(`Thiếu file public: ${rel}`);
}

function forbid(rel) {
  if (fs.existsSync(path.join(dist, rel))) errors.push(`File nội bộ lọt vào dist: ${rel}`);
}

function validateJson(rel) {
  requireFile(rel);
  try {
    JSON.parse(fs.readFileSync(path.join(dist, rel), "utf8"));
  } catch (error) {
    errors.push(`JSON không hợp lệ: ${rel} (${error.message})`);
  }
}

["index.html", "_headers", "_redirects", "sitemap.xml", "css/article.css", "js/article.js", "js/engagement.js", "privacy/index.html", "terms/index.html", "nguon-tin/index.html", "contact/index.html", "admin/index.html", "admin/login/index.html", "admin/app.css", "admin/app.js", "admin/login.css", "admin/login.js"].forEach(requireFile);
["data/events.json", "data/about.json", "data/site.json", "data/skills.json", "data/static-slugs.json"].forEach(validateJson);
["README.md", "CHANGES.md", "DEPLOY_CHECKLIST.md", "docs", "content", "scripts", "netlify.toml", "package.json", "wrangler.toml", ".publisher"].forEach(forbid);

const adminHtml = fs.readFileSync(path.join(dist, "admin", "index.html"), "utf8");
const loginHtml = fs.readFileSync(path.join(dist, "admin", "login", "index.html"), "utf8");
if (!adminHtml.includes('/admin/app.js') || !loginHtml.includes('/admin/login.js')) errors.push("Tài sản cổng /admin chưa dùng đường dẫn public cố định.");
if (/Dang-bai\.bat|127\.0\.0\.1|localhost/i.test(`${adminHtml}\n${loginHtml}`)) errors.push("Giao diện /admin public còn hướng dẫn dành riêng cho cổng cục bộ.");
if (!adminHtml.includes('id="banner-management"') || !adminHtml.includes('id="banner-interval-seconds"')) errors.push("Cổng /admin chưa có chức năng quản lý ảnh và tốc độ banner.");
if (!adminHtml.includes("Hộp thư góp ý") || !adminHtml.includes('id="message-management"')) errors.push("Cổng /admin chưa có hộp thư góp ý cho quản trị viên.");
if (!adminHtml.includes('id="title-align"') || !adminHtml.includes('id="summary-align"')) errors.push("Trình soạn bài chưa có điều khiển căn tiêu đề và tóm tắt.");
if (!adminHtml.includes('value="justify" selected')) errors.push("Tiêu đề và tóm tắt chưa mặc định căn đều hai bên.");
if (!adminHtml.includes('id="published-post-management"') || !adminHtml.includes('id="published-event-list"') || !adminHtml.includes('id="published-skill-list"')) errors.push("Cổng /admin chưa có khu quản lý bài đã đăng.");
if (!adminHtml.includes('id="create-user-form"') || !adminHtml.includes('id="create-temporary-password"')) errors.push("Cổng /admin chưa có biểu mẫu tạo thêm tài khoản.");
if (!adminHtml.includes('id="site-text-management"') || !adminHtml.includes('id="site-text-fields"')) errors.push("Cổng /admin chưa có khu chỉnh chữ trên Trang chủ.");

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
for (const match of html.matchAll(/(?:src|href)="((?:css|js|img)\/[^"?#]+)"/g)) requireFile(match[1]);
if (/newsletter|api\/newsletter|web3forms|type="email"/i.test(html)) errors.push("Trang chủ vẫn còn chức năng hoặc trường thu thập email.");
if (!html.includes("KHOA TOÁN - TIN HỌC VÀ ỨNG DỤNG KHCN TRONG PCTP")) errors.push("Footer trang chủ chưa đúng tên đơn vị.");
if (!html.includes("Cổng thông tin và nguồn tham khảo")) errors.push("Trang chủ chưa có khu vực cổng thông tin và nguồn tham khảo.");
if (!html.includes('id="popular-articles"') || !html.includes('class="popular-sidebar"') || !html.includes('class="timeline-layout"')) errors.push("Khu vực Tuyên truyền chưa có cột bài xem nhiều nhất.");
if (!html.includes('id="feedback-form"') || !html.includes("Thống kê truy cập")) errors.push("Trang chủ chưa có biểu mẫu tin nhắn hoặc thống kê truy cập.");
if (html.includes("Gửi góp ý về nội dung, nguồn tham khảo hoặc lỗi hiển thị")) errors.push("Khối gửi tin nhắn vẫn còn đoạn mô tả dài cần loại bỏ.");
if (!html.includes('id="news-ticker"') || !html.includes('id="ticker-weather"') || !html.includes('id="ticker-datetime"')) errors.push("Trang chủ chưa có thanh thời tiết, thời gian và Thời sự.");
if (!html.includes('id="official-sources-kicker"') || !html.includes('id="official-sources-hint"') || !html.includes('id="quiz-heading"')) errors.push("Các khối chữ Trang chủ chưa có điểm neo để admin cập nhật.");
if (/quick-news|tin-nhanh|Tổng hợp tin tức|Tin mới từ Bộ Công an|Làm mới tin/i.test(html)) errors.push("Trang chủ vẫn còn dấu vết khối tổng hợp tin ngoài cũ.");
if (!html.includes("sản phẩm dự thi Cuộc thi")) errors.push("Footer chưa nêu trạng thái sản phẩm dự thi.");

const events = JSON.parse(fs.readFileSync(path.join(dist, "data/events.json"), "utf8")).events || [];
for (const item of events) {
  if (item.externalSource || String(item.slug || "").startsWith("feed-")) errors.push(`Còn nội dung tổng hợp ngoài trong dữ liệu public: ${item.slug || item.title}`);
  if (item.workflowStatus && item.workflowStatus !== "PUBLISHED" && process.env.INCLUDE_UNPUBLISHED !== "1") {
    errors.push(`Bài chưa xuất bản lọt vào dữ liệu public: ${item.slug || item.title}`);
  }
}
for (const event of events.filter((item) => item.slug)) {
  requireFile(path.join("hoat-dong", event.slug, "index.html"));
}
const skills = JSON.parse(fs.readFileSync(path.join(dist, "data/skills.json"), "utf8")).skills || [];
for (const skill of skills) {
  if (skill.workflowStatus && skill.workflowStatus !== "PUBLISHED" && process.env.INCLUDE_UNPUBLISHED !== "1") {
    errors.push(`Bài kỹ năng chưa xuất bản lọt vào dữ liệu public: ${skill.slug || skill.title}`);
  }
}
for (const skill of skills.filter((item) => item.slug && item.pageUrl)) {
  requireFile(path.join("ky-nang", skill.slug, "index.html"));
}

const samplePage = [...events.filter((item) => item.slug), ...skills.filter((item) => item.slug && item.pageUrl)][0];
if (samplePage) {
  const prefix = events.includes(samplePage) ? "hoat-dong" : "ky-nang";
  const pageHtml = fs.readFileSync(path.join(dist, prefix, samplePage.slug, "index.html"), "utf8");
  if (!pageHtml.includes('/img/badge.png')) errors.push("Trang bài riêng chưa dùng logo Cẩm nang An toàn số.");
  if (!pageHtml.includes("Của Khoa KTT, Học viện CSND")) errors.push("Trang bài riêng chưa ghi rõ Cẩm nang của Khoa KTT, Học viện CSND.");
  if (!pageHtml.includes("KHOA TOÁN - TIN HỌC VÀ ỨNG DỤNG KHCN TRONG PCTP")) errors.push("Footer trang bài riêng chưa đúng tên đơn vị.");
  if (!pageHtml.includes('class="text-align-justify"')) errors.push("Trang bài riêng chưa mặc định căn đều tiêu đề hoặc tóm tắt.");
}

const site = JSON.parse(fs.readFileSync(path.join(dist, "data/site.json"), "utf8"));
if (!Array.isArray(site.officialSources) || site.officialSources.length !== 3) errors.push("Danh mục nguồn tham khảo phải có đúng Bộ Công an, A05 và Học viện CSND.");
const allowedSourceHosts = new Set(["bocongan.gov.vn", "hvcsnd.edu.vn"]);
for (const source of site.officialSources || []) {
  if (!source.name || !/^https:\/\//i.test(source.url || "")) errors.push("Liên kết nguồn chính thống không hợp lệ.");
  try {
    if (!allowedSourceHosts.has(new URL(source.url).hostname)) errors.push(`Nguồn tham khảo ngoài phạm vi được phép: ${source.url}`);
  } catch (_) {}
  for (const forbiddenField of ["articles", "items", "feed", "lastUpdated"]) {
    if (Object.hasOwn(source, forbiddenField)) errors.push(`Nguồn chính thống chứa trường dữ liệu tin bài không được phép: ${forbiddenField}`);
  }
}

const publicScripts = fs.readdirSync(path.join(dist, "js"))
  .filter((name) => name.endsWith(".js"))
  .map((name) => fs.readFileSync(path.join(dist, "js", name), "utf8"))
  .join("\n");
if (/\/api\/quick-news|api\/rss|parseHvcsnd|activity-feed/i.test(publicScripts)) {
  errors.push("JavaScript public vẫn còn cơ chế tải hoặc phân tích tin ngoài.");
}
if (!publicScripts.includes('/api/public/posts?type=event') || !publicScripts.includes('/api/weather')) {
  errors.push("Thanh Thời sự chưa lấy bài nội bộ hoặc chưa gọi API thời tiết cùng miền.");
}
if (!publicScripts.includes('/api/public/site-texts')) errors.push("Trang chủ chưa tải các khối chữ do admin quản lý.");

const articleCss = fs.readFileSync(path.join(dist, "css", "article.css"), "utf8");
if (!articleCss.includes("2.7rem") || !articleCss.includes(".text-align-justify")) errors.push("Cỡ tiêu đề bài hoặc kiểu căn đều chưa được cập nhật.");
if (/goatcounter|google-analytics|googletagmanager|plausible|matomo/i.test(`${html}\n${publicScripts}`)) {
  errors.push("Website public vẫn còn mã phân tích hoặc bộ đếm truy cập bên thứ ba.");
}
if (/fetch\s*\(\s*["']https?:\/\//i.test(publicScripts)) {
  errors.push("JavaScript public vẫn còn lệnh tự động tải dữ liệu từ miền ngoài.");
}

for (const payload of [events, skills]) {
  for (const item of payload) {
    const refs = [];
    if (item.image) refs.push(item.image);
    if (Array.isArray(item.images)) {
      item.images.forEach((entry) => refs.push(typeof entry === "string" ? entry : entry && (entry.src || entry.image)));
    }
    for (const match of String(item.bodyHtml || "").matchAll(/\/?(uploads\/[a-zA-Z0-9._/-]+)/g)) refs.push(match[1]);
    refs.filter((src) => typeof src === "string" && /^\/?uploads\//.test(src)).forEach((src) => requireFile(src.replace(/^\//, "")));
  }
}

if (errors.length) {
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Kiểm tra dist thành công: đủ dữ liệu, đủ tài sản và không lộ file nội bộ.");
