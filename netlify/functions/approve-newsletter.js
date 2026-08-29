// -*- coding: utf-8 -*-
// Admin bam nut "Duyet & Gui" trong email ban nhap (tu compose-newsletter.js)
// se goi toi day. Xac minh chu ky HMAC + han 48h cua noi dung nam trong URL
// (khong luu server-side, xem giai thich trong compose-newsletter.js), roi
// gui email cho TOAN BO contact trong Resend Audience.
//
// Day la buoc THUC SU GUI HANG LOAT - request nay phai den tu link trong
// email admin, khong duoc de public/lo secret.

const crypto = require("crypto");
const { sendEmail, listAudienceContacts, newsletterLayout, escapeHtml } = require("./_lib");

const SIGNING_SECRET = process.env.NEWSLETTER_SIGNING_SECRET;
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 gio

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const { data, sig } = params;

  if (!SIGNING_SECRET) {
    return { statusCode: 500, body: "Thieu bien moi truong NEWSLETTER_SIGNING_SECRET" };
  }
  if (!data || !sig) {
    return { statusCode: 400, body: "Thieu tham so" };
  }
  if (!RESEND_AUDIENCE_ID) {
    return { statusCode: 500, body: "Thieu bien moi truong RESEND_AUDIENCE_ID" };
  }

  const expectedSig = crypto.createHmac("sha256", SIGNING_SECRET).update(data).digest("hex");
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { statusCode: 403, body: "Chu ky khong hop le - link co the da bi sua hoac gia mao." };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch (e) {
    return { statusCode: 400, body: "Du lieu khong doc duoc" };
  }

  if (!payload.createdAt || Date.now() - payload.createdAt > MAX_AGE_MS) {
    return { statusCode: 410, body: "Link duyet da het han (qua 48 gio) - hay soan lai ban tin moi." };
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const bodyHtml = items
    .map(
      (it) => `
      <div style="margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid #e5ded0;">
        <div style="font-weight:700;color:#1a1206;margin-bottom:4px;">${escapeHtml(it.title)}</div>
        <div style="font-size:12px;color:#8a8065;margin-bottom:6px;">${escapeHtml(it.date)}${it.location ? " · " + escapeHtml(it.location) : ""}</div>
        <div>${escapeHtml(it.excerpt)}</div>
      </div>`
    )
    .join("");

  const html = newsletterLayout({
    title: payload.subject || "Bản tin An toàn số",
    bodyHtml,
    footerNote: "Trả lời email này nếu bạn muốn huỷ đăng ký",
  });

  let recipients;
  try {
    recipients = await listAudienceContacts(RESEND_AUDIENCE_ID);
  } catch (e) {
    return { statusCode: 502, body: "Khong lay duoc danh sach nguoi dang ky: " + e.message };
  }

  if (!recipients.length) {
    return { statusCode: 200, body: "Danh sach nguoi dang ky dang rong, khong gui gi." };
  }

  // Gui tuan tu tung nguoi (khong dung endpoint broadcast cua Resend de giu
  // code don gian/de kiem soat loi tung dia chi) - co dan cach nho giua cac
  // lan goi de khong vuot rate limit cua goi mien phi.
  let sent = 0;
  const failed = [];
  for (const to of recipients) {
    try {
      await sendEmail({ to, subject: payload.subject || "Bản tin An toàn số", html });
      sent++;
    } catch (e) {
      failed.push(to);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  return {
    statusCode: 200,
    body: `Da gui ${sent}/${recipients.length} email.` + (failed.length ? ` That bai: ${failed.join(", ")}` : ""),
  };
};
