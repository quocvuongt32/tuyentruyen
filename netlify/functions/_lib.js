// -*- coding: utf-8 -*-
// Ham dung chung cho cac Netlify Function ve email (on-subscribe.js,
// compose-newsletter.js, approve-newsletter.js). Chi dung Node core +
// fetch (co san tu Node 18, xem netlify.toml NODE_VERSION) - khong can
// npm install goi "resend" chinh thuc, goi thang REST API cho gon, dung
// quy uoc "khong phu thuoc npm ngoai" da co trong scripts/build-*.js.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NEWSLETTER_FROM =
  process.env.NEWSLETTER_FROM || "Cam nang An toan so <onboarding@resend.dev>";

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// Goi Resend API gui 1 email. Nem loi neu Resend tra ve khong OK, de noi
// goi biet ma xu ly/log - khong nuot loi am tham.
async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    throw new Error("Thieu bien moi truong RESEND_API_KEY");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: NEWSLETTER_FROM, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend send that bai (${res.status}): ${text}`);
  }
  return res.json();
}

// Lay toan bo contact trong 1 Resend Audience (danh sach nguoi dang ky).
// Endpoint theo tai lieu Resend hien tai (resend.com/docs/api-reference) -
// KIEM TRA LAI sau khi co API key that, cau truc response co the doi.
async function listAudienceContacts(audienceId) {
  if (!RESEND_API_KEY) {
    throw new Error("Thieu bien moi truong RESEND_API_KEY");
  }
  const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend list contacts that bai (${res.status}): ${text}`);
  }
  const data = await res.json();
  const list = Array.isArray(data && data.data) ? data.data : [];
  return list
    .filter((c) => !c.unsubscribed)
    .map((c) => c.email)
    .filter(Boolean);
}

function newsletterLayout({ title, bodyHtml, footerNote }) {
  return `<!doctype html>
<html lang="vi"><body style="margin:0;padding:0;background:#f7ecd2;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 20px;">
    <div style="text-align:center;margin-bottom:20px;">
      <span style="display:inline-block;padding:6px 16px;border-radius:999px;background:#d62828;color:#fff;font-weight:700;font-size:13px;letter-spacing:0.3px;">CẨM NANG AN TOÀN SỐ</span>
    </div>
    <h1 style="font-size:20px;color:#1a1206;margin:0 0 16px;">${escapeHtml(title)}</h1>
    <div style="font-size:14px;line-height:1.7;color:#3a331f;">${bodyHtml}</div>
    <hr style="border:0;border-top:1px solid #e5ded0;margin:28px 0 16px;" />
    <p style="font-size:12px;color:#8a8065;line-height:1.6;">
      Khoa Toán - Tin học và Ứng dụng KHCN trong PCTP, Học viện Cảnh sát nhân dân<br />
      <a href="https://tuyentruyen.khoaktt.vn" style="color:#d62828;">tuyentruyen.khoaktt.vn</a>
      ${footerNote ? " · " + footerNote : ""}
    </p>
  </div>
</body></html>`;
}

module.exports = {
  RESEND_API_KEY,
  NEWSLETTER_FROM,
  escapeHtml,
  sendEmail,
  listAudienceContacts,
  newsletterLayout,
};
