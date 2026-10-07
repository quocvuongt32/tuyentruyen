import { getPostBySlug, isPostHidden, renderArticle } from "../_lib/platform.js";

export async function onRequestGet(context) {
  try {
    const slug = String(context.params.slug || "");
    if (await isPostHidden(context.env, "skill", slug)) return new Response("Không tìm thấy bài viết.", { status: 404 });
    const row = await getPostBySlug(context.env, "skill", slug);
    return row ? renderArticle(context, row) : context.env.ASSETS.fetch(context.request);
  } catch (_) {
    return context.env.ASSETS.fetch(context.request);
  }
}
