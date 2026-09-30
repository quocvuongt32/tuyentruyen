import { HttpError, errorResponse, getPostBySlug, renderArticle, requireSession } from "../_lib/platform.js";

export async function onRequestGet(context) {
  try {
    const session = await requireSession(context);
    if (session.user.mustChangePassword) throw new HttpError(403, "Bạn phải đổi mật khẩu tạm trước khi xem bản thảo.");
    const raw = context.params.path;
    const parts = (Array.isArray(raw) ? raw : String(raw || "").split("/")).filter(Boolean);
    if (parts.length !== 2 || !["hoat-dong", "ky-nang"].includes(parts[0])) throw new HttpError(404, "Không tìm thấy bản xem trước.");
    const type = parts[0] === "ky-nang" ? "skill" : "event";
    const row = await getPostBySlug(context.env, type, parts[1], true);
    if (!row) throw new HttpError(404, "Không tìm thấy bản xem trước.");
    const allowed = session.user.role === "admin"
      || row.author_username === session.user.username
      || (session.user.role === "approver" && ["REVIEW", "APPROVED", "PUBLISHED"].includes(row.status));
    if (!allowed) throw new HttpError(403, "Tài khoản không có quyền xem bản thảo này.");
    return renderArticle(context, row, true);
  } catch (error) {
    return errorResponse(error);
  }
}
