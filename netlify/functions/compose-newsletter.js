// -*- coding: utf-8 -*-
// Admin TU BAM link nay (nen luu dau trang) khi muon soan 1 ky ban tin moi -
// KHONG chay tu dong theo lich, vi noi dung can duoc admin xem qua truoc khi
// gui hang loat (dung yeu cau: "gui cho email cua admin truoc de kiem duyet
// roi cho xac nhan moi gui dong loat").
//
// URL bam:
//   https://<domain>/.netlify/functions/compose-newsletter?secret=<COMPOSE_SECRET>
//
// Viec ham lam: doc data/events.json TU CHINH TRANG DA DEPLOY (khong doc
// truc tiep bang fs vi Netlify Functions dong goi rieng, khong chac chan co
// san file build luc runtime) -> chon vai su kien that gan day nhat lam noi
// dung tom tat -> dung 1 email BAN NHAP gui rieng cho ADMIN_EMAIL, kem nut
// "Duyet & Gui" (URL co chu ky HMAC + het han sau 48h, xem approve-newsletter.js).
// KHONG luu trang thai o dau ca (khong dung database/Blobs) - toan bo noi
// dung ban tin duoc ma hoa base64 ngay trong URL duyet, nen da CAT NGAN moi
// muc xuong doan trich ngan de URL khong qua dai (email client/trinh duyet
// co gioi han do dai URL).

const crypto = require("crypto");
const { sendEmail, newsletterLayout, escapeHtml } = require("./_lib");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const COMPOSE_SECRET = process.env.COMPOSE_SECRET;
const SIGNING_SECRET = process.env.NEWSLETTER_SIGNING_SECRET;
const SITE_URL = process.env.URL || process.env.SITE_URL || "https://tuyentruyen.khoaktt.vn";
const MAX_ITEMS = 5;
const EXCERPT_LEN = 220;

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  if (!COMPOSE_SECRET || params.secret !== COMPOSE_SECRET) {
    return { statusCode: 403, body: "Forbidden" };
  }
  if (!ADMIN_EMAIL || !SIGNING_SECRET) {
    return {
      statusCode: 500,
      body: "Thieu bien moi truong ADMIN_EMAIL hoac NEWSLETTER_SIGNING_SECRET",
    };
  }

  let events = [];
  try {
    const res = await fetch(`${SITE_URL}/data/events.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    events = Array.isArray(json.events) ? json.events : [];
  } catch (e) {
    return { statusCode: 502, body: "Khong tai duoc data/events.json: " + e.message };
  }

  // Chi lay su kien THAT (bo qua feed tu dong hvcsnd.edu.vn, nhan dien qua
  // slug bat dau "feed-" - cung quy uoc voi collectMediaItems() trong main.js)
  // va phai co noi dung tom tat (bodyHtml) moi dang len ban tin.
  const real = events.filter((e) => e.slug && !e.slug.startsWith("feed-") && e.bodyHtml);
  const picked = real.slice(0, MAX_ITEMS);

  if (!picked.length) {
    return { statusCode: 200, body: "Khong co su kien nao du dieu kien de dua vao ban tin." };
  }

  const items = picked.map((e) => ({
    title: e.title || "",
    date: e.date || "",
    location: e.location || "",
    excerpt: plainTextExcerpt(e.bodyHtml, EXCERPT_LEN),
    slug: e.slug || "",
  }));

  const subject = `Bản tin An toàn số — ${formatDateVi(new Date())}`;
  const bodyHtml = renderItemsHtml(items);

  const payload = { subject, items, createdAt: Date.now() };
  const payloadStr = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", SIGNING_SECRET).update(payloadStr).digest("hex");
  const approveUrl = `${SITE_URL}/.netlify/functions/approve-newsletter?data=${payloadStr}&sig=${signature}`;

  const previewHtml = newsletterLayout({
    title: "Bản nháp bản tin — chờ bạn duyệt",
    bodyHtml: `
      <p>Bản nháp kỳ bản tin định kỳ đã sẵn sàng. Xem nội dung bên dưới; nếu đồng ý,
      bấm nút để gửi cho <strong>toàn bộ người đã đăng ký</strong>:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${approveUrl}" style="display:inline-block;padding:12px 28px;background:#d62828;color:#fff;text-decoration:none;border-radius:999px;font-weight:700;">Duyệt &amp; Gửi cho người đăng ký</a>
      </p>
      <p style="font-size:12px;color:#8a8065;">Link có hiệu lực 48 giờ, chỉ dùng được 1 lần thực chất
      (Resend sẽ gửi ngay khi bấm — không bấm lại nếu đã gửi). Nếu không phải bạn yêu cầu, bỏ qua email này.</p>
      <hr style="border:0;border-top:1px solid #e5ded0;margin:20px 0;" />
      <p style="font-weight:700;">Xem trước nội dung sẽ gửi:</p>
      ${bodyHtml}
    `,
  });

  try {
    await sendEmail({ to: ADMIN_EMAIL, subject: "[Duyệt bản tin] " + subject, html: previewHtml });
  } catch (e) {
    return { statusCode: 502, body: "Gui email ban nhap cho admin that bai: " + e.message };
  }

  return { statusCode: 200, body: `Da gui ban nhap (${items.length} muc) cho ${ADMIN_EMAIL} de duyet.` };
};

function plainTextExcerpt(html, maxLen) {
  const text = String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

function formatDateVi(d) {
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function renderItemsHtml(items) {
  return items
    .map(
      (it) => `
      <div style="margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid #e5ded0;">
        <div style="font-weight:700;color:#1a1206;margin-bottom:4px;">${escapeHtml(it.title)}</div>
        <div style="font-size:12px;color:#8a8065;margin-bottom:6px;">${escapeHtml(it.date)}${it.location ? " · " + escapeHtml(it.location) : ""}</div>
        <div>${escapeHtml(it.excerpt)}</div>
      </div>`
    )
    .join("");
}
