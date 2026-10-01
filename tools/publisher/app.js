"use strict";

const state = {
  token: "",
  user: null,
  permissions: new Set(),
  images: [],
  pending: null,
  lastEditorRange: null,
  passwordResetTarget: "",
  passwordChangeForced: false,
  maxImages: 30,
  maxImageBytes: 2_500_000,
  bannerMaxImages: 30,
  bannerMaxUploadBatch: 8,
  imageOptimization: {
    maxEdge: 1920,
    targetBytes: 1_400_000,
    minQuality: 0.72,
    maxQuality: 0.9,
    maxSourceBytes: 250 * 1024 * 1024,
  },
};

const $ = (selector) => document.querySelector(selector);
const form = $("#post-form");
const bodyEditor = $("#body-editor");
const busy = $("#busy-overlay");
const toast = $("#toast");

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), isError ? 7000 : 3500);
}

function setBusy(active, title = "Đang xử lý…", message = "Vui lòng không đóng cửa sổ.") {
  busy.hidden = !active;
  $("#busy-title").textContent = title;
  $("#busy-message").textContent = message;
}

function hasPermission(permission) {
  return state.permissions.has(permission);
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "ten-bai-viet";
}

function currentType() {
  return form.elements.type.value;
}

function updateType() {
  const type = currentType();
  document.querySelectorAll(".type-card").forEach((card) => card.classList.toggle("selected", card.querySelector("input").checked));
  $("#location-field").hidden = type !== "event";
  $("#event-extra").hidden = type !== "event";
  $("#banner-option").hidden = type !== "event";
  $("#series-field").hidden = type !== "skill";
  $("#order-field").hidden = type !== "skill";
  $("#placement-field").hidden = type !== "event";
  $("#preview-type").textContent = type === "event" ? "Hoạt động tuyên truyền" : "Bài viết / kỹ năng";
  updatePlacement();
  updatePreview();
}

function updatePlacement() {
  const isTimeline = currentType() === "event" && $("#placement").value === "timeline";
  $("#category").disabled = isTimeline;
  if (isTimeline) $("#category").value = "an-ninh-mang";
  $("#placement-note").textContent = isTimeline
    ? "Bài sẽ xuất hiện ngay trong dòng thời gian Tuyên truyền An ninh mạng."
    : "Bài sẽ xuất hiện trong khu vực Hoạt động khác theo chủ đề đã chọn.";
}

function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function currentCover() {
  return state.images.find((item) => item.kind === "cover") || null;
}

function updatePreview() {
  const type = currentType();
  const title = $("#title").value.trim();
  const summary = $("#summary").value.trim();
  const date = $("#date").value;
  const location = $("#location").value.trim();
  const category = $("#category").selectedOptions[0]?.textContent || "";
  $("#preview-title").textContent = title || "Tiêu đề bài viết sẽ hiện ở đây";
  $("#preview-summary").textContent = summary || "Tóm tắt bài viết sẽ giúp người đọc quyết định mở bài.";
  $("#preview-meta").textContent = [formatDate(date), category, type === "event" ? location : ""].filter(Boolean).join(" · ");
  $("#preview-author").textContent = `Tác giả: ${state.user?.fullName || "—"}`;
  const prefix = type === "event" ? "hoat-dong" : "ky-nang";
  $("#slug-preview").textContent = `/${prefix}/${slugify(title)}/`;
  $("#summary-count").textContent = String($("#summary").value.length);
  const previewImage = $("#preview-image");
  const cover = currentCover();
  if (cover) {
    previewImage.style.backgroundImage = `url("${cover.dataUrl}")`;
    previewImage.classList.add("has-image");
  } else {
    previewImage.style.backgroundImage = "";
    previewImage.classList.remove("has-image");
  }
  const previewBody = $("#preview-rich-body");
  previewBody.innerHTML = bodyEditor.innerHTML || "<p>Nội dung được định dạng sẽ hiện tại đây.</p>";
  previewBody.querySelectorAll("button").forEach((button) => button.remove());
  previewBody.querySelectorAll("[contenteditable]").forEach((element) => element.removeAttribute("contenteditable"));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Không đọc được ảnh đã xử lý."));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Không thể chuyển đổi ảnh.")), "image/jpeg", quality));
}

async function decodeImage(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error(`${file.name}: chỉ nhận JPG, PNG hoặc WebP.`);
  if (file.size > state.imageOptimization.maxSourceBytes) throw new Error(`${file.name}: ảnh gốc vượt quá giới hạn an toàn ${(state.imageOptimization.maxSourceBytes / 1024 / 1024).toFixed(0)} MB.`);
  if ("createImageBitmap" in window) {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch (_) {}
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name}: ảnh hỏng hoặc trình duyệt không đọc được.`)); };
    image.src = url;
  });
}

function drawImage(source, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

async function encodeBestJpeg(canvas, targetBytes) {
  let low = state.imageOptimization.minQuality;
  let high = state.imageOptimization.maxQuality;
  let best = await canvasToBlob(canvas, low);
  if (best.size > targetBytes) return best;
  const highest = await canvasToBlob(canvas, high);
  if (highest.size <= targetBytes) return highest;
  for (let attempt = 0; attempt < 6; attempt++) {
    const quality = (low + high) / 2;
    const candidate = await canvasToBlob(canvas, quality);
    if (candidate.size <= targetBytes) { best = candidate; low = quality; }
    else high = quality;
  }
  return best;
}

async function optimizeImage(file) {
  const source = await decodeImage(file);
  try {
    const sourceWidth = source.width || source.naturalWidth;
    const sourceHeight = source.height || source.naturalHeight;
    if (sourceWidth < 320 || sourceHeight < 320) throw new Error(`${file.name}: mỗi chiều ảnh cần ít nhất 320 px.`);
    const scale = Math.min(1, state.imageOptimization.maxEdge / Math.max(sourceWidth, sourceHeight));
    let width = Math.max(1, Math.round(sourceWidth * scale));
    let height = Math.max(1, Math.round(sourceHeight * scale));
    const targetBytes = Math.min(state.imageOptimization.targetBytes, state.maxImageBytes - 100_000);
    let blob;
    for (let attempt = 0; attempt < 7; attempt++) {
      const canvas = drawImage(source, width, height);
      blob = await encodeBestJpeg(canvas, targetBytes);
      canvas.width = 1;
      canvas.height = 1;
      if (blob.size <= targetBytes) break;
      width = Math.max(320, Math.round(width * 0.88));
      height = Math.max(320, Math.round(height * 0.88));
    }
    if (!blob || blob.size > state.maxImageBytes) throw new Error(`${file.name}: không thể tối ưu xuống dưới 2,5 MB.`);
    return {
      id: `img-${crypto.randomUUID()}`,
      name: file.name,
      dataUrl: await blobToDataUrl(blob),
      width,
      height,
      bytes: blob.size,
      originalBytes: file.size,
      caption: "",
    };
  } finally {
    if (source.close) source.close();
  }
}

function restoreEditorRange() {
  bodyEditor.focus();
  const selection = window.getSelection();
  selection.removeAllRanges();
  if (state.lastEditorRange) selection.addRange(state.lastEditorRange);
  else {
    const range = document.createRange();
    range.selectNodeContents(bodyEditor);
    range.collapse(false);
    selection.addRange(range);
  }
}

function rememberEditorRange() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (bodyEditor.contains(range.commonAncestorContainer)) state.lastEditorRange = range.cloneRange();
}

function insertTopLevelEditorBlock(element) {
  restoreEditorRange();
  const selection = window.getSelection();
  const range = selection.rangeCount ? selection.getRangeAt(0) : null;
  let anchor = range?.commonAncestorContainer || bodyEditor;
  if (anchor.nodeType === Node.TEXT_NODE) anchor = anchor.parentElement;
  while (anchor && anchor.parentElement !== bodyEditor) anchor = anchor.parentElement;
  if (!anchor || anchor.parentElement !== bodyEditor) anchor = null;

  const paragraph = document.createElement("p");
  paragraph.innerHTML = "<br>";
  const replaceOnlyEmptyParagraph = anchor?.tagName === "P"
    && !anchor.textContent.trim()
    && bodyEditor.children.length === 1;
  if (replaceOnlyEmptyParagraph) anchor.replaceWith(element, paragraph);
  else if (anchor) anchor.after(element, paragraph);
  else bodyEditor.append(element, paragraph);

  const nextRange = document.createRange();
  nextRange.selectNodeContents(paragraph);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  state.lastEditorRange = nextRange.cloneRange();
}

function insertInlineFigure(item) {
  const figure = document.createElement("figure");
  figure.className = "editor-inline-image";
  figure.dataset.imageId = item.id;
  const image = document.createElement("img");
  image.src = item.dataUrl;
  image.alt = "Ảnh chèn trong bài";
  image.contentEditable = "false";
  const caption = document.createElement("figcaption");
  caption.textContent = "Nhập chú thích ảnh…";
  caption.dataset.placeholder = "true";
  caption.addEventListener("focus", () => {
    if (caption.dataset.placeholder === "true") { caption.textContent = ""; caption.dataset.placeholder = "false"; }
  });
  caption.addEventListener("input", updatePreview);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "editor-image-remove";
  remove.contentEditable = "false";
  remove.textContent = "Xóa ảnh";
  remove.addEventListener("click", () => {
    figure.remove();
    state.images = state.images.filter((imageItem) => imageItem.id !== item.id);
    updatePreview();
  });
  figure.append(image, caption, remove);
  insertTopLevelEditorBlock(figure);
  updatePreview();
}

async function addFiles(files, kind = "gallery") {
  const list = Array.from(files || []);
  if (!list.length) return;
  if (state.images.length + list.length > state.maxImages) {
    showToast(`Mỗi bài tối đa ${state.maxImages} ảnh.`, true);
    return;
  }
  setBusy(true, "Đang tối ưu ảnh…", `Đang xử lý 0/${list.length} ảnh.`);
  let added = 0;
  const errors = [];
  try {
    for (let index = 0; index < list.length; index++) {
      $("#busy-message").textContent = `Đang xử lý ${index + 1}/${list.length}: ${list[index].name}`;
      try {
        const item = await optimizeImage(list[index]);
        item.kind = kind === "inline" ? "inline" : currentCover() ? "gallery" : "cover";
        state.images.push(item);
        if (item.kind === "inline") insertInlineFigure(item);
        else renderImages();
        added++;
      } catch (error) {
        errors.push(error.message);
      }
    }
    if (errors.length) showToast(`Đã thêm ${added}/${list.length} ảnh. ${errors[0]}`, true);
    else showToast(`Đã tối ưu và thêm ngay ${added} ảnh.`);
  } finally {
    setBusy(false);
    $("#image-input").value = "";
    $("#inline-image-input").value = "";
  }
}

function galleryItems() {
  return state.images.filter((item) => item.kind !== "inline");
}

function setCover(id) {
  state.images.forEach((item) => {
    if (item.kind === "cover") item.kind = "gallery";
    if (item.id === id) item.kind = "cover";
  });
  renderImages();
}

function moveGallery(id, delta) {
  const visible = galleryItems();
  const index = visible.findIndex((item) => item.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= visible.length) return;
  const leftIndex = state.images.indexOf(visible[index]);
  const rightIndex = state.images.indexOf(visible[target]);
  [state.images[leftIndex], state.images[rightIndex]] = [state.images[rightIndex], state.images[leftIndex]];
  renderImages();
}

function removeGalleryImage(id) {
  const removed = state.images.find((item) => item.id === id);
  state.images = state.images.filter((item) => item.id !== id);
  if (removed?.kind === "cover") {
    const replacement = state.images.find((item) => item.kind === "gallery");
    if (replacement) replacement.kind = "cover";
  }
  renderImages();
}

function renderImages() {
  const container = $("#image-list");
  container.innerHTML = "";
  const visible = galleryItems();
  visible.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = `image-item${item.kind === "cover" ? " cover" : ""}`;
    const image = document.createElement("img");
    image.src = item.dataUrl;
    image.alt = item.name;
    card.appendChild(image);
    if (item.kind === "cover") {
      const badge = document.createElement("span");
      badge.className = "cover-badge";
      badge.textContent = "ẢNH ĐẠI DIỆN";
      card.appendChild(badge);
    }
    const footer = document.createElement("div");
    footer.className = "image-item-footer";
    const name = document.createElement("span");
    name.className = "image-item-name";
    const original = item.originalBytes ? `${(item.originalBytes / 1024 / 1024).toFixed(1)} MB → ` : "";
    name.textContent = `${item.name} · ${original}${(item.bytes / 1024).toFixed(0)} KB`;
    const caption = document.createElement("input");
    caption.className = "image-caption-input";
    caption.maxLength = 260;
    caption.placeholder = item.kind === "cover" ? "Chú thích ảnh đại diện (không bắt buộc)" : "Chú thích ảnh tư liệu (không bắt buộc)";
    caption.value = item.caption || "";
    caption.addEventListener("input", () => { item.caption = caption.value; });
    const actions = document.createElement("div");
    actions.className = "image-item-actions";
    [
      { text: "←", title: "Chuyển sang trái", click: () => moveGallery(item.id, -1), disabled: index === 0 },
      { text: "Bìa", title: "Đặt làm ảnh đại diện", click: () => setCover(item.id), disabled: item.kind === "cover" },
      { text: "→", title: "Chuyển sang phải", click: () => moveGallery(item.id, 1), disabled: index === visible.length - 1 },
      { text: "✕", title: "Xóa ảnh", click: () => removeGalleryImage(item.id) },
    ].forEach((config) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = config.text;
      button.title = config.title;
      button.disabled = config.disabled === true;
      button.addEventListener("click", config.click);
      actions.appendChild(button);
    });
    footer.append(name, caption, actions);
    card.appendChild(footer);
    container.appendChild(card);
  });
  updatePreview();
}

function blockAlignment(element) {
  const value = element.style.textAlign;
  return ["center", "right", "justify"].includes(value) ? value : "left";
}

function serializeEditorBlocks() {
  const blocks = [];
  for (const node of bodyEditor.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.trim()) blocks.push({ type: "paragraph", html: node.textContent, align: "left" });
      continue;
    }
    if (!(node instanceof HTMLElement)) continue;
    const tag = node.tagName.toLowerCase();
    if (tag === "figure" && node.dataset.imageId) {
      const captionElement = node.querySelector("figcaption");
      const caption = captionElement?.dataset.placeholder === "true" ? "" : captionElement?.textContent.trim() || "";
      blocks.push({ type: "image", imageId: node.dataset.imageId, caption });
    } else if (tag === "hr") {
      blocks.push({ type: "separator" });
    } else if (tag === "ul" || tag === "ol") {
      blocks.push({ type: tag, align: blockAlignment(node), items: [...node.children].filter((item) => item.tagName === "LI").map((item) => item.innerHTML) });
    } else {
      const type = tag === "h2" ? "heading2" : tag === "h3" ? "heading3" : tag === "blockquote" ? "blockquote" : "paragraph";
      blocks.push({ type, align: blockAlignment(node), html: node.innerHTML });
    }
  }
  return blocks;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", "X-Publisher-Token": state.token, ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => ({ error: "Máy chủ trả về dữ liệu không hợp lệ." }));
  if (response.status === 401) {
    window.location.replace("/admin/login");
    throw new Error("Phiên đăng nhập đã hết hạn.");
  }
  if (!response.ok || result.ok === false) throw new Error(result.error || `Lỗi HTTP ${response.status}`);
  return result;
}

function validateForm() {
  if (!form.reportValidity()) return false;
  const text = bodyEditor.innerText.replace(/\s+/g, " ").trim();
  if (text.length < 30) {
    showToast("Nội dung chi tiết cần ít nhất 30 ký tự.", true);
    bodyEditor.focus();
    return false;
  }
  if (!currentCover()) {
    showToast("Hãy chọn ít nhất một ảnh đại diện.", true);
    $("#drop-zone").scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  return true;
}

function payload() {
  const bodyBlocks = serializeEditorBlocks();
  const inlineIds = new Set(bodyBlocks.filter((block) => block.type === "image").map((block) => block.imageId));
  return {
    type: currentType(),
    title: $("#title").value,
    date: $("#date").value,
    placement: $("#placement").value,
    category: $("#category").value,
    location: $("#location").value,
    summary: $("#summary").value,
    bodyBlocks,
    series: $("#series").value,
    order: $("#order").value,
    link: $("#link").value,
    video: $("#video").value,
    featuredBanner: $("#featured-banner").checked,
    images: state.images
      .filter((item) => item.kind !== "inline" || inlineIds.has(item.id))
      .map((item) => ({ id: item.id, kind: item.kind, caption: item.caption || "", name: item.name, dataUrl: item.dataUrl, width: item.width, height: item.height })),
  };
}

function showReady(post) {
  state.pending = post;
  $("#result-icon").textContent = "✓";
  $("#copy-button").hidden = true;
  renderWorkflowState(post);
  renderPending(post);
}

function renderWorkflowState(post) {
  if (!post) return;
  state.pending = post;
  const status = post.workflowStatus || "DRAFT";
  const isOwner = post.createdUsername === state.user?.username;
  $("#result-panel").hidden = false;
  $("#result-url").textContent = post.url;
  $("#result-preview").href = post.previewUrl;
  $("#review-button").hidden = status !== "DRAFT" || !hasPermission("submit") || (!isOwner && state.user?.role !== "admin");
  $("#approve-publish-button").hidden = !["REVIEW", "APPROVED"].includes(status) || !hasPermission("approve") || !hasPermission("publish");
  $("#publish-button").hidden = !(status === "PUBLISHED" && post.committed === true && hasPermission("publish"));
  const messages = {
    DRAFT: ["Bản nháp đã vượt qua kiểm tra", isOwner || state.user?.role === "admin" ? "Hãy xem trước đầy đủ rồi gửi bài tới người thẩm định." : "Bản nháp đang chờ người tạo bài gửi thẩm định."],
    REVIEW: ["Bài đang chờ thẩm định", hasPermission("approve") ? "Đọc bản xem trước; nếu đạt yêu cầu, bấm Duyệt và đăng bài." : "Thượng tá Phạm Thị Ngân hoặc quản trị viên sẽ đọc và quyết định xuất bản."],
    APPROVED: ["Bài đã được duyệt", hasPermission("publish") ? "Bấm Duyệt và đăng bài để hoàn tất việc xuất bản." : "Bài đang chờ người có quyền xuất bản."],
    PUBLISHED: ["Bài đã được tạo commit", "Lần đẩy trước chưa hoàn tất. Người có quyền xuất bản có thể đẩy lại."],
  };
  const [title, message] = messages[status] || messages.DRAFT;
  $("#result-title").textContent = title;
  $("#result-message").textContent = message;
  $("#result-panel").scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderPending(post) {
  const banner = $("#pending-banner");
  banner.hidden = !post;
  if (!post) return;
  $("#pending-title").textContent = `${post.title} · ${post.workflowStatus || "DRAFT"}`;
  $("#pending-preview").href = post.previewUrl;
  $("#pending-discard").hidden = !hasPermission("discard") || (state.user?.role !== "admin" && post.createdUsername !== state.user?.username) || post.committed === true;
}

async function savePost(event) {
  event.preventDefault();
  if (!validateForm()) return;
  setBusy(true, "Đang tải bản nháp lên cổng quản trị…", "Ảnh sẽ được xác minh và lưu vào kho bảo mật trước khi tạo trang xem trước.");
  try {
    const result = await api("/api/create", { method: "POST", body: JSON.stringify(payload()) });
    showReady(result.post);
    showToast("Bài đã được lưu và kiểm tra thành công.");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function waitForLive(url) {
  for (let attempt = 1; attempt <= 36; attempt++) {
    $("#busy-message").textContent = `Đã xuất bản. Đang kiểm tra đường dẫn công khai (${attempt}/36)…`;
    try {
      const response = await fetch(`/api/check-live?url=${encodeURIComponent(url)}`, { cache: "no-store" });
      const result = await response.json();
      if (result.live) return true;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  return false;
}

async function finishPublished(post) {
  const isLive = await waitForLive(post.url);
  $("#result-panel").hidden = false;
  $("#result-icon").textContent = isLive ? "✓" : "↑";
  $("#result-title").textContent = isLive ? "Bài đã lên website" : "Bài đã được ghi nhận xuất bản";
  $("#result-message").textContent = isLive ? "Trang đã truy cập được. Bạn có thể sao chép liên kết để phổ biến." : "Hệ thống đang hoàn tất đường dẫn công khai; hãy kiểm tra lại sau ít phút.";
  $("#result-url").textContent = post.url;
  $("#result-preview").href = post.url;
  $("#review-button").hidden = true;
  $("#approve-publish-button").hidden = true;
  $("#publish-button").hidden = true;
  $("#copy-button").hidden = false;
  $("#copy-button").dataset.url = post.url;
  renderPending(null);
  state.pending = null;
  showToast(isLive ? "Đăng bài thành công." : "Bài đã được ghi nhận xuất bản.");
}

async function submitReview() {
  if (!confirm("Gửi bản nháp này tới người thẩm định? Sau bước này nội dung được khóa để đọc và duyệt.")) return;
  setBusy(true, "Đang gửi bài đi thẩm định…", "Đang ghi nhận người gửi và dựng lại bản xem trước.");
  try {
    const result = await api("/api/review", { method: "POST", body: "{}" });
    renderWorkflowState(result.post);
    renderPending(result.post);
    showToast("Đã chuyển bài sang trạng thái chờ thẩm định.");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function approveAndPublish() {
  if (!confirm("Xác nhận bài đã đạt yêu cầu thẩm định và đăng lên website?")) return;
  setBusy(true, "Đang duyệt và đăng bài…", "Đang ghi nhận người thẩm định và mở bài trên website.");
  try {
    const result = await api("/api/approve-publish", { method: "POST", body: "{}" });
    await finishPublished(result.post);
  } catch (error) {
    showToast(error.message, true);
    try {
      const config = await api("/api/config");
      if (config.pending) { renderWorkflowState(config.pending); renderPending(config.pending); }
    } catch (_) {}
  } finally {
    setBusy(false);
  }
}

async function publishPost() {
  setBusy(true, "Đang đăng lại bài lên website…", "Đang sử dụng bản nội dung đã được duyệt.");
  try {
    const result = await api("/api/publish", { method: "POST", body: "{}" });
    await finishPublished(result.post);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function discardPost() {
  if (!confirm("Hủy bản đang xử lý và xóa các ảnh vừa tạo?")) return;
  setBusy(true, "Đang hủy bản nháp…", "Ảnh và dữ liệu của bản chưa xuất bản sẽ được xóa.");
  try {
    await api("/api/discard", { method: "POST", body: "{}" });
    state.pending = null;
    renderPending(null);
    $("#result-panel").hidden = true;
    showToast("Đã hủy bản nháp.");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

function openPasswordModal({ forced = false, target = "" } = {}) {
  state.passwordChangeForced = forced;
  state.passwordResetTarget = target;
  $("#password-modal").hidden = false;
  $("#password-modal-title").textContent = target ? `Đặt lại mật khẩu: ${target}` : forced ? "Đổi mật khẩu tạm" : "Đổi mật khẩu";
  $("#password-modal-note").textContent = forced
    ? "Đây là mật khẩu tạm dùng một lần. Hãy đổi trước khi tiếp tục."
    : "Mật khẩu mới cần ít nhất 12 ký tự, có chữ hoa, chữ thường và chữ số.";
  $("#current-password-field").hidden = Boolean(target);
  $("#current-password").required = !target;
  $("#password-cancel").hidden = forced;
  $("#new-password").value = "";
  $("#confirm-password").value = "";
  setTimeout(() => (target ? $("#new-password") : $("#current-password")).focus(), 30);
}

function closePasswordModal() {
  if (state.passwordChangeForced) return;
  $("#password-modal").hidden = true;
  state.passwordResetTarget = "";
  $("#password-form").reset();
}

async function savePassword(event) {
  event.preventDefault();
  const next = $("#new-password").value;
  if (next !== $("#confirm-password").value) {
    showToast("Hai lần nhập mật khẩu mới chưa khớp.", true);
    return;
  }
  try {
    if (state.passwordResetTarget) {
      await api("/api/users/reset-password", { method: "POST", body: JSON.stringify({ username: state.passwordResetTarget, newPassword: next }) });
      showToast(`Đã đặt mật khẩu tạm mới cho ${state.passwordResetTarget}.`);
      await loadUsers();
    } else {
      const result = await api("/api/change-password", { method: "POST", body: JSON.stringify({ currentPassword: $("#current-password").value, newPassword: next }) });
      state.user = result.user;
      state.token = result.csrfToken;
      state.permissions = new Set(result.permissions || []);
      state.passwordChangeForced = false;
      showToast("Đã đổi mật khẩu thành công.");
      applyAccess();
    }
    $("#password-modal").hidden = true;
    $("#password-form").reset();
    state.passwordResetTarget = "";
  } catch (error) {
    showToast(error.message, true);
  }
}

function roleLabel(role) {
  return role === "admin" ? "Quản trị toàn quyền" : role === "approver" ? "Thẩm định và đăng" : "Soạn và gửi duyệt";
}

async function loadUsers() {
  if (!hasPermission("manage-users")) return;
  const result = await api("/api/users");
  const list = $("#user-list");
  list.innerHTML = "";
  result.users.forEach((user) => {
    const row = document.createElement("article");
    row.className = "user-row";
    row.innerHTML = `<div class="user-identity"><strong></strong><code></code><small></small></div>`;
    row.querySelector("strong").textContent = user.fullName;
    row.querySelector("code").textContent = user.username;
    row.querySelector("small").textContent = user.mustChangePassword ? "Phải đổi mật khẩu khi đăng nhập" : "Mật khẩu đã được cá nhân hóa";
    const name = document.createElement("input");
    name.value = user.fullName;
    name.maxLength = 160;
    name.setAttribute("aria-label", `Họ tên ${user.username}`);
    const role = document.createElement("select");
    role.setAttribute("aria-label", `Vai trò ${user.username}`);
    [["author", "Soạn và gửi duyệt"], ["approver", "Thẩm định và đăng"], ["admin", "Quản trị toàn quyền"]].forEach(([value, label]) => {
      const option = new Option(label, value, false, user.role === value);
      role.add(option);
    });
    const activeLabel = document.createElement("label");
    activeLabel.className = "user-active";
    const active = document.createElement("input");
    active.type = "checkbox";
    active.checked = user.active;
    activeLabel.append(active, document.createTextNode(" Đang hoạt động"));
    const actions = document.createElement("div");
    actions.className = "user-actions";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "button primary";
    save.textContent = "Lưu quyền";
    save.addEventListener("click", async () => {
      try {
        await api("/api/users/update", { method: "POST", body: JSON.stringify({ username: user.username, fullName: name.value, role: role.value, active: active.checked }) });
        showToast(`Đã cập nhật ${user.username}: ${roleLabel(role.value)}.`);
        await loadUsers();
      } catch (error) { showToast(error.message, true); }
    });
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "button ghost";
    reset.textContent = "Đặt lại mật khẩu";
    reset.disabled = user.username === state.user.username;
    reset.addEventListener("click", () => openPasswordModal({ target: user.username }));
    if (user.username === state.user.username) {
      name.disabled = true;
      role.disabled = true;
      active.disabled = true;
      save.disabled = true;
      save.textContent = "Tài khoản đang dùng";
    }
    actions.append(save, reset);
    row.append(name, role, activeLabel, actions);
    list.appendChild(row);
  });
}

function updateMessageBadge(count) {
  const badge = $("#messages-badge");
  const total = Number(count || 0);
  badge.textContent = String(total);
  badge.hidden = total < 1;
}

function formatMessageTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

async function loadMessages() {
  if (!hasPermission("manage-messages")) return;
  const result = await api("/api/messages");
  const list = $("#message-list");
  list.innerHTML = "";
  const messages = Array.isArray(result.messages) ? result.messages : [];
  updateMessageBadge(messages.filter((item) => item.status === "NEW").length);
  if (!messages.length) {
    const empty = document.createElement("p");
    empty.className = "empty-admin";
    empty.textContent = "Chưa có tin nhắn góp ý nào.";
    list.appendChild(empty);
    return;
  }
  messages.forEach((message) => {
    const row = document.createElement("article");
    row.className = `message-row${message.status === "NEW" ? " is-new" : ""}`;
    const copy = document.createElement("div");
    copy.className = "message-copy";
    const status = document.createElement("span");
    status.className = "message-status";
    status.textContent = message.status === "NEW" ? "CHƯA ĐỌC" : "ĐÃ ĐỌC";
    const content = document.createElement("p");
    content.textContent = message.content;
    const time = document.createElement("time");
    time.dateTime = message.createdAt;
    time.textContent = `Gửi lúc ${formatMessageTime(message.createdAt)}`;
    copy.append(status, content, time);
    const actions = document.createElement("div");
    actions.className = "message-actions";
    if (message.status === "NEW") {
      const read = document.createElement("button");
      read.type = "button";
      read.className = "button primary";
      read.textContent = "Đánh dấu đã đọc";
      read.addEventListener("click", async () => {
        try {
          await api("/api/messages/read", { method: "POST", body: JSON.stringify({ id: message.id }) });
          await loadMessages();
        } catch (error) { showToast(error.message, true); }
      });
      actions.appendChild(read);
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button danger";
    remove.textContent = "Xóa";
    remove.addEventListener("click", async () => {
      if (!window.confirm("Xóa vĩnh viễn tin nhắn này?")) return;
      try {
        await api("/api/messages/delete", { method: "POST", body: JSON.stringify({ id: message.id }) });
        showToast("Đã xóa tin nhắn.");
        await loadMessages();
      } catch (error) { showToast(error.message, true); }
    });
    actions.appendChild(remove);
    row.append(copy, actions);
    list.appendChild(row);
  });
}

function renderBannerImages(images) {
  const list = $("#banner-image-list");
  list.innerHTML = "";
  if (!images.length) {
    const empty = document.createElement("p");
    empty.className = "empty-admin";
    empty.textContent = "Banner hiện chưa có ảnh. Trang chủ sẽ chỉ hiển thị huy hiệu.";
    list.appendChild(empty);
    return;
  }
  images.forEach((image, index) => {
    const item = document.createElement("figure");
    item.className = "banner-admin-item";
    const preview = document.createElement("img");
    preview.src = image.src;
    preview.alt = image.caption || `Ảnh banner ${index + 1}`;
    preview.loading = "lazy";
    const footer = document.createElement("figcaption");
    const label = document.createElement("span");
    label.textContent = image.caption || `Ảnh ${index + 1}${image.uploaded ? " · đã tải lên" : " · ảnh hiện có"}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Xóa";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`Xóa ảnh số ${index + 1} khỏi banner Trang chủ?`)) return;
      try {
        await api("/api/banner/delete", { method: "POST", body: JSON.stringify({ id: image.id }) });
        showToast("Đã xóa ảnh khỏi banner.");
        await loadBannerManager();
      } catch (error) { showToast(error.message, true); }
    });
    footer.append(label, remove);
    item.append(preview, footer);
    list.appendChild(item);
  });
}

async function loadBannerManager() {
  if (!hasPermission("manage-banner")) return;
  const result = await api("/api/banner");
  state.bannerMaxImages = Number(result.maxImages || 30);
  state.bannerMaxUploadBatch = Number(result.maxUploadBatch || 8);
  $("#banner-interval-seconds").value = String(Math.round(Number(result.intervalMs || 4000) / 1000));
  renderBannerImages(Array.isArray(result.images) ? result.images : []);
}

async function saveBannerSpeed() {
  const seconds = Number($("#banner-interval-seconds").value);
  if (!Number.isInteger(seconds) || seconds < 2 || seconds > 20) {
    showToast("Thời gian mỗi ảnh phải từ 2 đến 20 giây.", true);
    return;
  }
  try {
    await api("/api/banner/settings", { method: "POST", body: JSON.stringify({ intervalMs: seconds * 1000 }) });
    showToast(`Đã đặt tốc độ banner: ${seconds} giây/ảnh.`);
  } catch (error) { showToast(error.message, true); }
}

async function uploadBannerFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  if (files.length > state.bannerMaxUploadBatch) {
    showToast(`Mỗi lần chỉ chọn tối đa ${state.bannerMaxUploadBatch} ảnh banner.`, true);
    return;
  }
  setBusy(true, "Đang tối ưu ảnh banner…", "Ảnh sẽ được thu nhỏ hợp lý trước khi tải lên.");
  try {
    const images = [];
    for (let index = 0; index < files.length; index++) {
      $("#busy-message").textContent = `Đang xử lý ảnh ${index + 1}/${files.length}: ${files[index].name}`;
      const optimized = await optimizeImage(files[index]);
      images.push({ dataUrl: optimized.dataUrl, caption: "" });
    }
    await api("/api/banner/upload", { method: "POST", body: JSON.stringify({ images }) });
    showToast(`Đã thêm ${images.length} ảnh vào banner Trang chủ.`);
    await loadBannerManager();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    $("#banner-image-input").value = "";
    setBusy(false);
  }
}

function applyAccess() {
  if (!state.user) return;
  $("#session-user").textContent = `${state.user.fullName} · ${roleLabel(state.user.role)}`;
  $("#author").value = state.user.fullName;
  $("#manage-users-open").hidden = !hasPermission("manage-users");
  $("#banner-open").hidden = !hasPermission("manage-banner");
  $("#messages-open").hidden = !hasPermission("manage-messages");
  form.hidden = !hasPermission("create") || Boolean(state.pending);
  if (!hasPermission("create")) {
    $(".hero-panel h1").textContent = "Khu vực thẩm định bài viết";
    $(".hero-panel p:last-child").textContent = "Mở bản xem trước, đọc toàn bộ nội dung rồi quyết định duyệt và đăng.";
  }
  updatePreview();
  if (state.pending) { renderPending(state.pending); renderWorkflowState(state.pending); }
  if (state.user.mustChangePassword) openPasswordModal({ forced: true });
}

async function initialize() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (response.status === 401) { window.location.replace("/admin/login"); return; }
    const config = await response.json();
    if (!response.ok) throw new Error(config.error || "Không tải được cấu hình.");
    state.token = config.csrfToken;
    state.user = config.user;
    state.permissions = new Set(config.permissions || []);
    state.maxImages = config.maxImages;
    state.maxImageBytes = config.maxImageBytes;
    updateMessageBadge(config.unreadMessages);
    if (config.imageOptimization) state.imageOptimization = { ...state.imageOptimization, ...config.imageOptimization };
    state.pending = config.pending;
    applyAccess();
  } catch (error) {
    showToast(error.message || "Không kết nối được với cổng biên tập cục bộ.", true);
  }
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $("#date").value = local;
  updateType();
}

document.querySelectorAll(".editor-toolbar button").forEach((button) => {
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", () => {
    const command = button.dataset.command;
    const action = button.dataset.action;
    if (command) {
      restoreEditorRange();
      document.execCommand(command, false, null);
      rememberEditorRange();
      updatePreview();
    } else if (action === "link") {
      restoreEditorRange();
      const url = prompt("Nhập liên kết bắt đầu bằng https://");
      if (url && /^https?:\/\//i.test(url)) document.execCommand("createLink", false, url);
      else if (url) showToast("Liên kết phải bắt đầu bằng http:// hoặc https://", true);
    } else if (action === "image") {
      rememberEditorRange();
      $("#inline-image-input").click();
    } else if (action === "separator") {
      insertTopLevelEditorBlock(document.createElement("hr"));
      updatePreview();
    }
  });
});

$("#block-format").addEventListener("change", (event) => {
  restoreEditorRange();
  document.execCommand("formatBlock", false, event.target.value);
  rememberEditorRange();
  updatePreview();
});
bodyEditor.addEventListener("keyup", () => { rememberEditorRange(); updatePreview(); });
bodyEditor.addEventListener("mouseup", rememberEditorRange);
bodyEditor.addEventListener("input", updatePreview);
bodyEditor.addEventListener("paste", (event) => {
  event.preventDefault();
  document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
});

form.addEventListener("submit", savePost);
form.addEventListener("input", updatePreview);
document.querySelectorAll('input[name="type"]').forEach((input) => input.addEventListener("change", updateType));
$("#placement").addEventListener("change", () => { updatePlacement(); updatePreview(); });
const dropZone = $("#drop-zone");
dropZone.addEventListener("click", () => $("#image-input").click());
dropZone.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $("#image-input").click(); } });
dropZone.addEventListener("dragover", (event) => { event.preventDefault(); dropZone.classList.add("dragging"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
dropZone.addEventListener("drop", (event) => { event.preventDefault(); dropZone.classList.remove("dragging"); addFiles(event.dataTransfer.files, "gallery"); });
$("#image-input").addEventListener("change", (event) => addFiles(event.target.files, "gallery"));
$("#inline-image-input").addEventListener("change", (event) => addFiles(event.target.files, "inline"));
$("#review-button").addEventListener("click", submitReview);
$("#approve-publish-button").addEventListener("click", approveAndPublish);
$("#publish-button").addEventListener("click", publishPost);
$("#pending-publish").addEventListener("click", () => { if (state.pending) renderWorkflowState(state.pending); });
$("#pending-discard").addEventListener("click", discardPost);
$("#copy-button").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("#copy-button").dataset.url); showToast("Đã sao chép liên kết."); }
  catch (_) { showToast("Không tự sao chép được; hãy bôi đen đường dẫn và sao chép.", true); }
});
$("#logout-button").addEventListener("click", async () => {
  try { await fetch("/api/logout", { method: "POST" }); } finally { window.location.replace("/admin/login"); }
});
$("#change-password-open").addEventListener("click", () => openPasswordModal());
$("#password-cancel").addEventListener("click", closePasswordModal);
$("#password-form").addEventListener("submit", savePassword);
$("#manage-users-open").addEventListener("click", async () => {
  const section = $("#user-management");
  section.hidden = false;
  await loadUsers();
  section.scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#banner-open").addEventListener("click", async () => {
  const section = $("#banner-management");
  section.hidden = false;
  try {
    await loadBannerManager();
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { showToast(error.message, true); }
});
$("#banner-speed-save").addEventListener("click", saveBannerSpeed);
$("#banner-add-button").addEventListener("click", () => $("#banner-image-input").click());
$("#banner-image-input").addEventListener("change", (event) => uploadBannerFiles(event.target.files));
$("#messages-open").addEventListener("click", async () => {
  const section = $("#message-management");
  section.hidden = false;
  try {
    await loadMessages();
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { showToast(error.message, true); }
});

initialize();
