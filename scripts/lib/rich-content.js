"use strict";

const BLOCK_TYPES = new Set(["paragraph", "heading2", "heading3", "blockquote", "ul", "ol", "image", "separator"]);
const ALIGNMENTS = new Set(["left", "center", "right", "justify"]);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return /^https?:$/.test(url.protocol) ? url.href : "";
  } catch (_) {
    return "";
  }
}

function sanitizeInlineHtml(value, maxLength = 12_000) {
  const input = String(value || "");
  if (input.length > maxLength * 2) throw new Error("Một khối nội dung dài quá giới hạn cho phép.");
  const tagPattern = /<[^>]*>/g;
  const simpleTags = new Set(["strong", "em", "u", "sup", "sub"]);
  const aliases = { b: "strong", i: "em" };
  let output = "";
  let cursor = 0;
  let openAnchors = 0;
  let match;

  while ((match = tagPattern.exec(input))) {
    output += escapeHtml(decodeEntities(input.slice(cursor, match.index)));
    cursor = match.index + match[0].length;
    const parsed = match[0].match(/^<\s*(\/?)\s*([a-z0-9]+)([^>]*)>$/i);
    if (!parsed) continue;
    const closing = parsed[1] === "/";
    const rawName = parsed[2].toLowerCase();
    const name = aliases[rawName] || rawName;
    if (name === "br" && !closing) {
      output += "<br>";
      continue;
    }
    if (simpleTags.has(name)) {
      output += closing ? `</${name}>` : `<${name}>`;
      continue;
    }
    if (name === "a") {
      if (closing) {
        if (openAnchors > 0) {
          output += "</a>";
          openAnchors--;
        }
        continue;
      }
      const hrefMatch = parsed[3].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = safeHttpUrl(hrefMatch && (hrefMatch[1] || hrefMatch[2] || hrefMatch[3]));
      if (href) {
        output += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`;
        openAnchors++;
      }
    }
  }
  output += escapeHtml(decodeEntities(input.slice(cursor)));
  while (openAnchors-- > 0) output += "</a>";
  if (output.length > maxLength) throw new Error("Một khối nội dung dài quá giới hạn cho phép.");
  return output;
}

function cleanCaption(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 260);
}

function isSafeImagePath(value) {
  return typeof value === "string" && /^\/?uploads\/[a-zA-Z0-9._/-]+$/.test(value) && !value.includes("..");
}

function normalizeBlocks(rawBlocks, resolveImage = (value) => value) {
  if (!Array.isArray(rawBlocks)) return [];
  if (rawBlocks.length > 240) throw new Error("Bài viết có quá nhiều khối nội dung.");
  const blocks = [];
  for (const raw of rawBlocks) {
    if (!raw || typeof raw !== "object" || !BLOCK_TYPES.has(raw.type)) continue;
    const align = ALIGNMENTS.has(raw.align) ? raw.align : "left";
    if (raw.type === "image") {
      const src = resolveImage(raw.imageId || raw.src);
      if (!isSafeImagePath(src)) throw new Error("Ảnh chèn trong bài không hợp lệ hoặc chưa được tải lên.");
      blocks.push({ type: "image", src: src.startsWith("/") ? src : `/${src}`, caption: cleanCaption(raw.caption) });
      continue;
    }
    if (raw.type === "separator") {
      blocks.push({ type: "separator" });
      continue;
    }
    if (raw.type === "ul" || raw.type === "ol") {
      const items = (Array.isArray(raw.items) ? raw.items : [])
        .slice(0, 100)
        .map((item) => sanitizeInlineHtml(item, 4_000))
        .filter((item) => item.replace(/<[^>]+>/g, "").trim());
      if (items.length) blocks.push({ type: raw.type, align, items });
      continue;
    }
    const html = sanitizeInlineHtml(raw.html, 12_000);
    if (html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim() || /<br>/.test(html)) {
      blocks.push({ type: raw.type, align, html });
    }
  }
  return blocks;
}

function alignClass(block) {
  return block.align && block.align !== "left" ? ` class="text-align-${block.align}"` : "";
}

function renderBlocks(rawBlocks) {
  const blocks = normalizeBlocks(rawBlocks);
  return blocks.map((block) => {
    const attrs = alignClass(block);
    if (block.type === "paragraph") return `<p${attrs}>${block.html}</p>`;
    if (block.type === "heading2") return `<h2${attrs}>${block.html}</h2>`;
    if (block.type === "heading3") return `<h3${attrs}>${block.html}</h3>`;
    if (block.type === "blockquote") return `<blockquote${attrs}>${block.html}</blockquote>`;
    if (block.type === "ul" || block.type === "ol") return `<${block.type}${attrs}>${block.items.map((item) => `<li>${item}</li>`).join("")}</${block.type}>`;
    if (block.type === "separator") return "<hr>";
    if (block.type === "image") {
      const caption = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : "";
      return `<figure class="article-inline-image"><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.caption || "Ảnh minh họa")}" loading="lazy" decoding="async">${caption}</figure>`;
    }
    return "";
  }).join("");
}

function plainTextFromBlocks(rawBlocks) {
  const blocks = Array.isArray(rawBlocks) ? rawBlocks : [];
  return blocks.map((block) => {
    if (!block || typeof block !== "object") return "";
    if (block.type === "image") return cleanCaption(block.caption);
    if (Array.isArray(block.items)) return block.items.join(" ");
    return block.html || "";
  }).join(" ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { escapeHtml, normalizeBlocks, plainTextFromBlocks, renderBlocks, sanitizeInlineHtml };
