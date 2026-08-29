// -*- coding: utf-8 -*-
// Netlify Forms goi webhook nay khi co nguoi dang ky ban tin moi qua form
// "dang-ky-ban-tin" (index.html). CAN CAU HINH THU CONG 1 LAN trong Netlify
// UI: Site configuration > Forms > Form notifications > Add notification >
// Outgoing webhook - chon form "dang-ky-ban-tin", URL to toi:
//   https://<ten-site>.netlify.app/.netlify/functions/on-subscribe
// (hoac domain that: https://tuyentruyen.khoaktt.vn/.netlify/functions/on-subscribe)
//
// Viec ham lam: (1) gui email chao mung cho nguoi vua dang ky, (2) neu co
// cau hinh RESEND_AUDIENCE_ID thi them ho vao Audience de sau nay
// compose-newsletter.js/approve-newsletter.js gui ban tin dinh ky cho ca
// danh sach.

const { sendEmail, newsletterLayout } = require("./_lib");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: "Bad payload" };
  }

  // Netlify Forms outgoing webhook goi { payload: { form_name, data: {...} } }
  const formName = payload && (payload.form_name || (payload.payload && payload.payload.form_name));
  const data = (payload && payload.data) || (payload && payload.payload && payload.payload.data);
  const email = data && data.email;

  if (formName !== "dang-ky-ban-tin" || !email) {
    // Khong phai form ban tin (vd form gop y) - bo qua, khong phai loi.
    return { statusCode: 200, body: "Ignored (not newsletter form)" };
  }

  if (!RESEND_API_KEY) {
    console.error("on-subscribe: thieu RESEND_API_KEY, bo qua gui email");
    return { statusCode: 200, body: "Skipped (no RESEND_API_KEY configured)" };
  }

  const html = newsletterLayout({
    title: "Cảm ơn bạn đã đăng ký!",
    bodyHtml: `
      <p>Xin chào,</p>
      <p>Cảm ơn bạn đã đăng ký nhận bản tin từ <strong>Cẩm nang An toàn số</strong>
      (tuyentruyen.khoaktt.vn) — nền tảng tuyên truyền an ninh mạng của Khoa Toán -
      Tin học và Ứng dụng KHCN trong PCTP, Học viện CSND.</p>
      <p>Từ nay bạn sẽ nhận được bản tin định kỳ tổng hợp:</p>
      <ul>
        <li>Thủ đoạn lừa đảo, tội phạm công nghệ cao mới nhất</li>
        <li>Kỹ năng tự bảo vệ trên không gian mạng</li>
        <li>Hoạt động tuyên truyền nổi bật của đơn vị</li>
      </ul>
      <p>Chúng tôi cam kết không gửi thư rác và không chia sẻ email của bạn cho bên
      thứ ba. Bạn có thể huỷ đăng ký bất cứ lúc nào bằng cách trả lời email này.</p>
    `,
  });

  try {
    await sendEmail({
      to: email,
      subject: "Xác nhận đăng ký nhận bản tin — Cẩm nang An toàn số",
      html,
    });
  } catch (e) {
    console.error("on-subscribe: gui email chao mung that bai", e);
    // Khong tra loi 500 vi Netlify se retry webhook nhieu lan gay spam - chi log.
  }

  if (RESEND_AUDIENCE_ID) {
    try {
      const res = await fetch(`https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      });
      if (!res.ok) {
        console.error("on-subscribe: them vao Audience that bai", await res.text());
      }
    } catch (e) {
      console.error("on-subscribe: loi khi them vao Audience", e);
    }
  }

  return { statusCode: 200, body: "OK" };
};
