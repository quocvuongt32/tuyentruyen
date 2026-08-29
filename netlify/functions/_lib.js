// -*- coding: utf-8 -*-
// Ham dung chung cho cac Netlify Function ve email (on-subscribe.js,
// compose-newsletter.js, approve-newsletter.js). Chi dung Node core +
// fetch (co san tu Node 18, xem netlify.toml NODE_VERSION) - khong can
// npm install goi "resend" chinh thuc, goi thang REST API cho gon, dung
// quy uoc "khong phu thuoc npm ngoai" da co trong scripts/build-*.js.
//
// LUU Y VE API CUA RESEND (da kiem tra truc tiep trong tai khoan that):
// khong co khai niem "Audience ID" trong URL - /contacts la endpoint
// "flat" dung chung cho ca tai khoan. Gui hang loat dung /broadcasts
// (nham vao 1 "segment", Resend tu tao san 1 segment mac dinh ten
// "General") + /broadcasts/{id}/send.

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

// Them 1 nguoi dang ky vao danh ba Resend. API cua Resend la "flat" - khong
// co khai niem Audience ID trong URL, chi POST /contacts voi email.
async function createContact({ email }) {
  if (!RESEND_API_KEY) {
    throw new Error("Thieu bien moi truong RESEND_API_KEY");
  }
  const res = await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, unsubscribed: false }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend them contact that bai (${res.status}): ${text}`);
  }
  return res.json();
}

// Tao 1 broadcast nham vao 1 segment (vd segment "General" mac dinh cua tai
// khoan) roi gui ngay. Day la co che gui hang loat that su cua Resend -
// thay the cho viec tu lap gui tung email tung nguoi.
async function createAndSendBroadcast({ segmentId, from, subject, html }) {
  if (!RESEND_API_KEY) {
    throw new Error("Thieu bien moi truong RESEND_API_KEY");
  }
  const createRes = await fetch("https://api.resend.com/broadcasts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ segment_id: segmentId, from, subject, html }),
  });
  if (!createRes.ok) {
    const text = await createRes.text().catch(() => "");
    throw new Error(`Resend tao broadcast that bai (${createRes.status}): ${text}`);
  }
  const created = await createRes.json();
  const broadcastId = created && created.id;
  if (!broadcastId) {
    throw new Error("Resend tao broadcast khong tra ve id");
  }

  const sendRes = await fetch(`https://api.resend.com/broadcasts/${broadcastId}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!sendRes.ok) {
    const text = await sendRes.text().catch(() => "");
    throw new Error(`Resend gui broadcast that bai (${sendRes.status}): ${text}`);
  }
  return { broadcastId, ...(await sendRes.json().catch(() => ({}))) };
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
  createContact,
  createAndSendBroadcast,
  newsletterLayout,
};
