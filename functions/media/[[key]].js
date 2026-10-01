import { errorResponse, getSession, securityHeaders } from "../_lib/platform.js";

export async function onRequestGet(context) {
  try {
    const raw = context.params.key;
    const key = Array.isArray(raw) ? raw.join("/") : String(raw || "");
    const bannerMatch = key.match(/^banner\/([a-f0-9-]{36})\.jpg$/);
    if (bannerMatch) {
      const banner = await context.env.DB.prepare("SELECT 1 AS found FROM site_banner_images WHERE storage_key=? LIMIT 1").bind(key).first();
      if (!banner) return new Response("Không tìm thấy ảnh.", { status: 404 });
      const object = await context.env.MEDIA.getWithMetadata(key, "arrayBuffer");
      if (!object?.value) return new Response("Không tìm thấy ảnh.", { status: 404 });
      const headers = new Headers(securityHeaders("public, max-age=31536000, immutable"));
      headers.set("Content-Type", object.metadata?.contentType || "image/jpeg");
      return new Response(object.value, { headers });
    }
    const match = key.match(/^posts\/([a-f0-9-]{36})\/img-[a-zA-Z0-9-]{8,80}\.jpg$/);
    if (!match) return new Response("Không tìm thấy ảnh.", { status: 404 });
    const post = await context.env.DB.prepare("SELECT status,author_username FROM posts WHERE id=? LIMIT 1").bind(match[1]).first();
    if (!post) return new Response("Không tìm thấy ảnh.", { status: 404 });
    const isPublic = post.status === "PUBLISHED";
    if (!isPublic) {
      const session = await getSession(context);
      const allowed = session && (session.user.role === "admin" || session.user.username === post.author_username || (session.user.role === "approver" && ["REVIEW", "APPROVED"].includes(post.status)));
      if (!allowed) return new Response("Không tìm thấy ảnh.", { status: 404 });
    }
    const object = await context.env.MEDIA.getWithMetadata(key, "arrayBuffer");
    if (!object?.value) return new Response("Không tìm thấy ảnh.", { status: 404 });
    const headers = new Headers(securityHeaders(isPublic ? "public, max-age=31536000, immutable" : "no-store"));
    headers.set("Content-Type", object.metadata?.contentType || "image/jpeg");
    return new Response(object.value, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
