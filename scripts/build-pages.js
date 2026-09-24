"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const siteUrl = "https://tuyentruyen.khoaktt.vn";
const academyName = "HỌC VIỆN CẢNH SÁT NHÂN DÂN";
const unitName = "KHOA TOÁN - TIN HỌC VÀ ỨNG DỤNG KHCN TRONG PCTP";
const siteName = "TRANG THÔNG TIN ĐIỆN TỬ CẨM NANG AN TOÀN SỐ";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function description(item) {
  const text = String(item.summary || stripHtml(item.bodyHtml) || item.title || "").trim();
  return text.length > 180 ? `${text.slice(0, 177).trim()}…` : text;
}

function absoluteAsset(src) {
  if (!src) return `${siteUrl}/img/og-image.jpg`;
  if (/^https?:\/\//i.test(src)) return src;
  return `${siteUrl}/${String(src).replace(/^\/+/, "")}`;
}

function formatDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return "";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function imageList(item) {
  const raw = Array.isArray(item.images) ? item.images : [];
  const list = raw
    .map((entry) => typeof entry === "string" ? entry : entry && (entry.src || entry.image))
    .filter(Boolean);
  if (item.image && !list.includes(item.image)) list.unshift(item.image);
  return list;
}

function renderGallery(item) {
  const images = imageList(item);
  if (!images.length) return "";
  const [cover, ...rest] = images;
  return `
    <figure class="article-cover"><img src="${escapeHtml(cover)}" alt="${escapeHtml(item.title)}" decoding="async"></figure>
    ${rest.length ? `<div class="article-gallery">${rest.map((src) => `<a href="${escapeHtml(src)}" target="_blank" rel="noopener"><img src="${escapeHtml(src)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async"></a>`).join("")}</div>` : ""}`;
}

function renderReferenceLinks(item) {
  const links = [];
  if (item.videoUrl) links.push(`<a class="article-reference" href="${escapeHtml(item.videoUrl)}" target="_blank" rel="noopener noreferrer">Xem video ↗</a>`);
  if (item.link) links.push(`<a class="article-reference" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Xem nguồn tham khảo ↗</a>`);
  return links.length ? `<div class="article-references">${links.join("")}</div>` : "";
}

function renderOfficialFooter() {
  return `<footer class="article-footer">
    <strong>${academyName}</strong>
    <span>${unitName}</span>
    <span>${siteName}</span>
    <span>Đơn vị quản lý: Khoa Toán - Tin học và Ứng dụng KHCN trong PCTP</span>
    <span>Chịu trách nhiệm quản lý nội dung: Thượng tá Phạm Thị Ngân · Quản trị kỹ thuật: Đại úy Nguyễn Quốc Vương</span>
    <span class="article-footer-notice">Cẩm nang phục vụ tuyên truyền và giáo dục kỹ năng an toàn số trong và ngoài Học viện Cảnh sát nhân dân. Đây là sản phẩm dự thi Cuộc thi “Sáng tạo sản phẩm truyền thông số về ứng dụng khoa học công nghệ; chuyển đổi số và đổi mới sáng tạo” do Ban Thường vụ Đảng ủy Học viện Cảnh sát nhân dân phát động.</span>
    <span class="article-footer-status">Website đang trong giai đoạn vận hành, hoàn thiện thủ tục công nhận; nội dung có tính chất tuyên truyền, tham khảo và không thay thế Cổng Thông tin điện tử, văn bản hoặc thông báo chính thức của Học viện Cảnh sát nhân dân.</span>
    <nav aria-label="Thông tin pháp lý và liên hệ">
      <a href="/#gioi-thieu">Giới thiệu</a><a href="/terms/">Điều khoản sử dụng</a><a href="/privacy/">Chính sách bảo vệ dữ liệu cá nhân</a><a href="/nguon-tin/">Bản quyền và nguồn tin</a><a href="/contact/">Liên hệ</a>
    </nav>
  </footer>`;
}

function renderPage(item, kind, navigation = "") {
  const prefix = kind === "event" ? "hoat-dong" : "ky-nang";
  const label = kind === "event" ? "Hoạt động tuyên truyền" : "Bộ kỹ năng số";
  const canonical = `${siteUrl}/${prefix}/${encodeURIComponent(item.slug)}/`;
  const desc = description(item);
  const cover = absoluteAsset(imageList(item)[0]);
  const meta = [formatDate(item.date), item.categoryLabel || item.category, item.location].filter(Boolean);
  const body = item.bodyHtml || (item.summary ? `<p>${escapeHtml(item.summary)}</p>` : "");
  return `<!doctype html>
<html lang="vi-VN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(item.title)} | Cẩm nang An toàn số</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="vi_VN">
  <meta property="og:site_name" content="Cẩm nang An toàn số">
  <meta property="og:title" content="${escapeHtml(item.title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${escapeHtml(cover)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(item.title)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <meta name="twitter:image" content="${escapeHtml(cover)}">
  <link rel="icon" href="/img/favicon.png">
  <link rel="stylesheet" href="/css/article.css">
</head>
<body>
  <header class="article-header">
    <a class="article-brand" href="/" aria-label="Về trang chủ">
      <img src="/img/badge.png" alt="Logo Cẩm nang An toàn số của Khoa KTT" width="76" height="58">
      <span><strong>CẨM NANG AN TOÀN SỐ</strong><small>Của Khoa KTT, Học viện CSND</small></span>
    </a>
    <a class="back-home" href="/">← Trang chủ</a>
  </header>
  <main class="article-shell">
    <nav class="article-breadcrumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span aria-hidden="true">›</span><span>${label}</span></nav>
    <article class="article-card">
      <div class="article-kicker">${label}</div>
      <h1>${escapeHtml(item.title)}</h1>
      ${meta.length ? `<p class="article-meta">${meta.map(escapeHtml).join(" · ")}</p>` : ""}
      ${item.summary ? `<p class="article-lead">${escapeHtml(item.summary)}</p>` : ""}
      ${renderGallery(item)}
      <div class="article-content">${body}</div>
      ${renderReferenceLinks(item)}
      ${navigation}
      <div class="article-actions">
        <button type="button" id="copy-link" class="primary-action">Sao chép liên kết</button>
        <button type="button" id="share-link" class="secondary-action">Chia sẻ bài</button>
      </div>
      <p id="share-status" class="share-status" aria-live="polite"></p>
    </article>
  </main>
  ${renderOfficialFooter()}
  <script src="/js/article.js" defer></script>
</body>
</html>`;
}

const policyPages = [
  {
    slug: "privacy",
    title: "Chính sách bảo vệ dữ liệu cá nhân",
    description: "Thông tin về dữ liệu được xử lý khi truy cập Trang thông tin điện tử Cẩm nang An toàn số.",
    body: `
      <p>Trang thông tin điện tử Cẩm nang An toàn số tôn trọng và bảo vệ dữ liệu cá nhân của người truy cập. Website không cung cấp biểu mẫu đăng ký bản tin, không yêu cầu tạo tài khoản công khai và không thu thập địa chỉ email.</p>
      <h2>Dữ liệu kỹ thuật</h2>
      <p>Khi truy cập, hệ thống lưu trữ hoặc các dịch vụ kỹ thuật liên quan có thể tự động xử lý dữ liệu nhật ký tối thiểu như địa chỉ IP, thời điểm, loại trình duyệt, trang được truy cập và thông tin chẩn đoán lỗi nhằm vận hành, bảo vệ và thống kê mức sử dụng website.</p>
      <h2>Mục đích và phạm vi sử dụng</h2>
      <p>Dữ liệu kỹ thuật chỉ được dùng để cung cấp nội dung, phát hiện sự cố, phòng ngừa hành vi gây hại và cải thiện chất lượng trang. Website không bán dữ liệu cá nhân và không dùng dữ liệu để gửi quảng cáo hoặc bản tin qua email.</p>
      <h2>Dịch vụ và liên kết bên ngoài</h2>
      <p>Website có thể tải dữ liệu thời tiết, thống kê lượt truy cập hoặc dẫn tới nguồn tin chính thống bên ngoài. Khi mở liên kết ngoài, chính sách của đơn vị cung cấp dịch vụ đó được áp dụng.</p>
      <h2>Thời gian lưu trữ và quyền của người truy cập</h2>
      <p>Dữ liệu kỹ thuật được lưu trong thời gian cần thiết theo cấu hình vận hành, an toàn hệ thống và chính sách của nhà cung cấp hạ tầng. Người truy cập có thể gửi yêu cầu liên quan đến dữ liệu cá nhân qua đầu mối công vụ nêu tại trang Liên hệ.</p>`,
  },
  {
    slug: "terms",
    title: "Điều khoản sử dụng",
    description: "Điều kiện truy cập và sử dụng nội dung của Trang thông tin điện tử Cẩm nang An toàn số.",
    body: `
      <p>Website phục vụ tuyên truyền, giáo dục kỹ năng an toàn trên không gian mạng và giới thiệu hoạt động phù hợp của Khoa Toán - Tin học và Ứng dụng KHCN trong PCTP, Học viện Cảnh sát nhân dân.</p>
      <h2>Phạm vi thông tin</h2>
      <p>Nội dung có tính chất tham khảo, phổ biến kiến thức và không thay thế văn bản quy phạm pháp luật, chỉ đạo nghiệp vụ hoặc thông báo chính thức của cơ quan có thẩm quyền.</p>
      <h2>Trách nhiệm của người sử dụng</h2>
      <p>Không sử dụng website để xâm nhập, gây gián đoạn, phát tán mã độc, thu thập dữ liệu trái phép, giả mạo nhận diện hoặc xuyên tạc nội dung. Khi trích dẫn phải ghi rõ nguồn và tuân thủ quy định về bản quyền.</p>
      <h2>Liên kết ngoài và cập nhật</h2>
      <p>Liên kết ngoài được cung cấp để kiểm chứng hoặc tham khảo; đơn vị quản lý không kiểm soát toàn bộ nội dung và chính sách của website bên ngoài. Điều khoản có thể được cập nhật để phù hợp yêu cầu quản lý và an toàn hệ thống.</p>`,
  },
  {
    slug: "nguon-tin",
    title: "Bản quyền và nguồn tin",
    description: "Quy định về nguồn, quyền sử dụng và trích dẫn nội dung trên Cẩm nang An toàn số.",
    body: `
      <p>Nội dung trên website gồm sản phẩm do Khoa tự thực hiện và thông tin được tổng hợp, trích dẫn từ các nguồn chính thống như Học viện Cảnh sát nhân dân, Bộ Công an, ANTV, cơ quan báo chí và nguồn hợp pháp khác.</p>
      <h2>Nguyên tắc sử dụng nguồn ngoài</h2>
      <p>Website ưu tiên tóm tắt, ghi nguồn và dẫn liên kết tới nội dung gốc; không sao chép toàn văn khi chưa xác định quyền sử dụng. Tên cơ quan, tác giả, chú thích và đường dẫn nguồn được giữ theo thông tin có thể xác minh tại thời điểm biên tập.</p>
      <h2>Hình ảnh, video và tài liệu</h2>
      <p>Media chỉ được công bố sau khi rà soát nguồn, quyền sử dụng và nguy cơ lộ dữ liệu cá nhân, thông tin nhạy cảm hoặc nội dung không được phép công khai. Việc trích dẫn lại phải giữ nguyên ngữ cảnh, ghi rõ nguồn và không làm phát sinh cách hiểu sai về cơ quan quản lý.</p>
      <h2>Yêu cầu điều chỉnh</h2>
      <p>Nếu phát hiện nội dung ghi nguồn chưa chính xác hoặc có vấn đề về quyền sử dụng, vui lòng liên hệ đơn vị quản lý qua kênh công vụ để được kiểm tra và xử lý.</p>`,
  },
  {
    slug: "contact",
    title: "Liên hệ",
    description: "Đầu mối quản lý nội dung và quản trị kỹ thuật của Trang thông tin điện tử Cẩm nang An toàn số.",
    body: `
      <p><strong>Đơn vị quản lý:</strong> Khoa Toán - Tin học và Ứng dụng KHCN trong PCTP, Học viện Cảnh sát nhân dân.</p>
      <p><strong>Chịu trách nhiệm quản lý nội dung:</strong> Thượng tá Phạm Thị Ngân.</p>
      <p><strong>Quản trị kỹ thuật:</strong> Đại úy Nguyễn Quốc Vương.</p>
      <p>Để góp ý, yêu cầu điều chỉnh nguồn tin, bản quyền hoặc dữ liệu cá nhân, vui lòng liên hệ trực tiếp qua kênh công vụ của Khoa. Website không sử dụng biểu mẫu thu thập họ tên hoặc địa chỉ email.</p>`,
  },
];

function renderPolicyPage(page) {
  const canonical = `${siteUrl}/${page.slug}/`;
  return `<!doctype html>
<html lang="vi-VN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)} | Cẩm nang An toàn số</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index,follow">
  <link rel="icon" href="/img/favicon.png">
  <link rel="stylesheet" href="/css/article.css">
</head>
<body>
  <header class="article-header">
    <a class="article-brand" href="/" aria-label="Về trang chủ">
      <img src="/img/badge.png" alt="Logo Cẩm nang An toàn số của Khoa KTT" width="76" height="58">
      <span><strong>CẨM NANG AN TOÀN SỐ</strong><small>Của Khoa KTT, Học viện CSND</small></span>
    </a>
    <a class="back-home" href="/">← Trang chủ</a>
  </header>
  <main class="article-shell policy-shell">
    <nav class="article-breadcrumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span aria-hidden="true">›</span><span>${escapeHtml(page.title)}</span></nav>
    <article class="article-card policy-card"><div class="article-kicker">Thông tin chính thức</div><h1>${escapeHtml(page.title)}</h1><p class="article-lead">${escapeHtml(page.description)}</p><div class="article-content">${page.body}</div></article>
  </main>
  ${renderOfficialFooter()}
</body>
</html>`;
}

function writePolicyPages() {
  policyPages.forEach((page) => {
    const dir = path.join(dist, page.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), renderPolicyPage(page), "utf8");
  });
}

function writePage(prefix, item, navigation = "") {
  const dir = path.join(dist, prefix, item.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), renderPage(item, prefix === "hoat-dong" ? "event" : "skill", navigation), "utf8");
}

const eventsPayload = JSON.parse(fs.readFileSync(path.join(dist, "data", "events.json"), "utf8"));
const skillsPayload = JSON.parse(fs.readFileSync(path.join(dist, "data", "skills.json"), "utf8"));
const events = (eventsPayload.events || []).filter((item) => item.slug && !item.slug.startsWith("feed-") && !item.externalSource);
const skills = (skillsPayload.skills || []).filter((item) => item.slug && item.pageUrl);

events.forEach((item) => writePage("hoat-dong", item));

const seriesGroups = new Map();
skills.forEach((item) => {
  if (!item.series) return;
  if (!seriesGroups.has(item.series)) seriesGroups.set(item.series, []);
  seriesGroups.get(item.series).push(item);
});
seriesGroups.forEach((items) => items.sort((a, b) => (a.order || 9999) - (b.order || 9999)));

skills.forEach((item) => {
  let navigation = "";
  const group = item.series ? seriesGroups.get(item.series) || [] : [];
  const index = group.findIndex((entry) => entry.slug === item.slug);
  if (group.length > 1) {
    const prev = index > 0 ? group[index - 1] : null;
    const next = index >= 0 && index < group.length - 1 ? group[index + 1] : null;
    navigation = `<nav class="series-nav" aria-label="Bài trong chuỗi"><div><small>Chuỗi kỹ năng</small><strong>${escapeHtml(item.series)}</strong></div>${prev ? `<a href="/ky-nang/${prev.slug}/">← ${escapeHtml(prev.title)}</a>` : ""}${next ? `<a href="/ky-nang/${next.slug}/">${escapeHtml(next.title)} →</a>` : ""}</nav>`;
  }
  writePage("ky-nang", item, navigation);
});

writePolicyPages();

const urls = [
  `${siteUrl}/`,
  ...policyPages.map((page) => `${siteUrl}/${page.slug}/`),
  ...events.map((item) => `${siteUrl}/hoat-dong/${encodeURIComponent(item.slug)}/`),
  ...skills.map((item) => `${siteUrl}/ky-nang/${encodeURIComponent(item.slug)}/`),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemap, "utf8");

console.log(`Đã tạo ${events.length} trang hoạt động, ${skills.length} trang kỹ năng, ${policyPages.length} trang thông tin và sitemap.xml.`);
