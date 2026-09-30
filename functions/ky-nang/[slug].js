import { getPostBySlug, renderArticle } from "../_lib/platform.js";

export async function onRequestGet(context) {
  try {
    const row = await getPostBySlug(context.env, "skill", String(context.params.slug || ""));
    return row ? renderArticle(context, row) : context.env.ASSETS.fetch(context.request);
  } catch (_) {
    return context.env.ASSETS.fetch(context.request);
  }
}
