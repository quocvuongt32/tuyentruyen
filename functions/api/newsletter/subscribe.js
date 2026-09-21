const RESEND_API = "https://api.resend.com";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function validEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

async function resend(path, apiKey, init) {
  return fetch(`${RESEND_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init && init.headers),
    },
  });
}

async function upsertContact(email, env) {
  const body = {
    email,
    unsubscribed: false,
    segments: [{ id: env.RESEND_SEGMENT_ID }],
  };
  const created = await resend("/contacts", env.RESEND_API_KEY, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (created.ok) return;
  if (created.status !== 409) {
    throw new Error(`Resend create contact: HTTP ${created.status}`);
  }

  const updated = await resend(`/contacts/${encodeURIComponent(email)}`, env.RESEND_API_KEY, {
    method: "PATCH",
    body: JSON.stringify({ unsubscribed: false }),
  });
  if (!updated.ok) throw new Error(`Resend update contact: HTTP ${updated.status}`);

  const segmented = await resend(
    `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(env.RESEND_SEGMENT_ID)}`,
    env.RESEND_API_KEY,
    { method: "POST", body: "{}" }
  );
  if (!segmented.ok && segmented.status !== 409) {
    throw new Error(`Resend add segment: HTTP ${segmented.status}`);
  }
}

async function sendWelcome(email, env) {
  if (!env.NEWSLETTER_FROM) return;
  const sent = await resend("/emails", env.RESEND_API_KEY, {
    method: "POST",
    body: JSON.stringify({
      from: env.NEWSLETTER_FROM,
      to: email,
      subject: "Đăng ký thành công — Cẩm nang An toàn số",
      html: `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;line-height:1.65;color:#2b2518">
        <h1 style="font-size:20px">Bạn đã đăng ký Cẩm nang An toàn số</h1>
        <p>Cảm ơn bạn đã đăng ký nhận cảnh báo thủ đoạn lừa đảo và kỹ năng an toàn số.</p>
        <p>Mỗi bản tin đều có liên kết hủy đăng ký do Resend quản lý.</p>
        <p><a href="https://tuyentruyen.khoaktt.vn/">Mở Cẩm nang An toàn số</a></p>
      </body></html>`,
    }),
  });
  if (!sent.ok) throw new Error(`Resend welcome email: HTTP ${sent.status}`);
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.RESEND_SEGMENT_ID) {
    console.error("Newsletter is missing RESEND_API_KEY or RESEND_SEGMENT_ID");
    return json({ success: false, message: "Dịch vụ bản tin chưa được cấu hình." }, 503);
  }

  let data;
  try {
    data = await request.json();
  } catch (error) {
    return json({ success: false, message: "Dữ liệu không hợp lệ." }, 400);
  }

  if (data.botcheck) return json({ success: true });
  const email = String(data.email || "").trim().toLowerCase();
  if (!validEmail(email) || data.consent !== "yes") {
    return json({ success: false, message: "Email hoặc xác nhận đồng ý không hợp lệ." }, 400);
  }

  try {
    await upsertContact(email, env);
    await sendWelcome(email, env);
    return json({ success: true });
  } catch (error) {
    console.error("Newsletter subscribe failed", error);
    return json({ success: false, message: "Không thể đăng ký lúc này." }, 502);
  }
}

export function onRequest() {
  return json({ success: false, message: "Method not allowed." }, 405);
}
