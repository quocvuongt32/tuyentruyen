"use strict";

const state = {
  token: "",
  images: [],
  pending: null,
  maxImages: 15,
  maxImageBytes: 2_500_000,
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
  const prefix = type === "event" ? "hoat-dong" : "ky-nang";
  $("#slug-preview").textContent = `/${prefix}/${slugify(title)}/`;
  $("#summary-count").textContent = String($("#summary").value.length);
  const previewImage = $("#preview-image");
  if (state.images.length) {
    previewImage.style.backgroundImage = `url("${state.images[0].dataUrl}")`;
    previewImage.classList.add("has-image");
  } else {
    previewImage.style.backgroundImage = "";
    previewImage.classList.remove("has-image");
  }
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
    if (candidate.size <= targetBytes) {
      best = candidate;
      low = quality;
    } else {
      high = quality;
    }
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
      name: file.name,
      dataUrl: await blobToDataUrl(blob),
      width,
      height,
      bytes: blob.size,
      originalBytes: file.size,
    };
  } finally {
    if (source.close) source.close();
  }
}

async function addFiles(files) {
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
        state.images.push(await optimizeImage(list[index]));
        added++;
        // Hien anh ngay sau khi toi uu xong, khong doi ca lo anh.
        renderImages();
      } catch (error) {
        errors.push(error.message);
      }
    }
    if (errors.length) showToast(`Đã thêm ${added}/${list.length} ảnh. ${errors[0]}`, true);
    else showToast(`Đã tối ưu và thêm ngay ${added} ảnh.`);
  } finally {
    setBusy(false);
    $("#image-input").value = "";
  }
}

function moveImage(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= state.images.length) return;
  [state.images[index], state.images[target]] = [state.images[target], state.images[index]];
  renderImages();
}

function renderImages() {
  const container = $("#image-list");
  container.innerHTML = "";
  state.images.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = `image-item${index === 0 ? " cover" : ""}`;
    const image = document.createElement("img");
    image.src = item.dataUrl;
    image.alt = item.name;
    card.appendChild(image);
    if (index === 0) {
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
    footer.appendChild(name);
    const actions = document.createElement("div");
    actions.className = "image-item-actions";
    const buttons = [
      { text: "←", title: "Chuyển sang trái", click: () => moveImage(index, -1), disabled: index === 0 },
      { text: "Bìa", title: "Đặt làm ảnh đại diện", click: () => { const [selected] = state.images.splice(index, 1); state.images.unshift(selected); renderImages(); }, disabled: index === 0 },
      { text: "→", title: "Chuyển sang phải", click: () => moveImage(index, 1), disabled: index === state.images.length - 1 },
      { text: "✕", title: "Xóa ảnh", click: () => { state.images.splice(index, 1); renderImages(); } },
    ];
    buttons.forEach((config) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = config.text;
      button.title = config.title;
      button.disabled = config.disabled === true;
      button.addEventListener("click", config.click);
      actions.appendChild(button);
    });
    footer.appendChild(actions);
    card.appendChild(footer);
    container.appendChild(card);
  });
  updatePreview();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", "X-Publisher-Token": state.token, ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => ({ error: "Máy chủ trả về dữ liệu không hợp lệ." }));
  if (!response.ok || result.ok === false) throw new Error(result.error || `Lỗi HTTP ${response.status}`);
  return result;
}

function validateForm() {
  if (!form.reportValidity()) return false;
  if ($("#body").value.trim().length < 30) {
    showToast("Nội dung chi tiết cần ít nhất 30 ký tự.", true);
    $("#body").focus();
    return false;
  }
  if (!state.images.length) {
    showToast("Hãy chọn ít nhất một ảnh đại diện.", true);
    $("#drop-zone").scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  return true;
}

function payload() {
  return {
    type: currentType(),
    title: $("#title").value,
    date: $("#date").value,
    placement: $("#placement").value,
    category: $("#category").value,
    location: $("#location").value,
    summary: $("#summary").value,
    body: $("#body").value,
    series: $("#series").value,
    order: $("#order").value,
    link: $("#link").value,
    video: $("#video").value,
    featuredBanner: $("#featured-banner").checked,
    images: state.images.map((item) => ({ name: item.name, dataUrl: item.dataUrl, width: item.width, height: item.height })),
  };
}

function showReady(post) {
  state.pending = post;
  $("#result-panel").hidden = false;
  $("#result-icon").textContent = "✓";
  $("#result-title").textContent = "Bài đã vượt qua kiểm tra";
  $("#result-message").textContent = "Ảnh hợp lệ, build thành công và URL riêng đã được tạo. Hãy xem trước rồi mới đăng.";
  $("#result-url").textContent = post.url;
  $("#result-preview").href = post.previewUrl;
  $("#publish-button").hidden = false;
  $("#copy-button").hidden = true;
  $("#result-panel").scrollIntoView({ behavior: "smooth", block: "center" });
  renderPending(post);
}

function renderPending(post) {
  const banner = $("#pending-banner");
  banner.hidden = !post;
  if (!post) return;
  $("#pending-title").textContent = post.title;
  $("#pending-preview").href = post.previewUrl;
}

async function savePost(event) {
  event.preventDefault();
  if (!validateForm()) return;
  setBusy(true, "Đang tạo bài và kiểm tra website…", "Ảnh sẽ được xác minh lại, sau đó chạy build và kiểm tra các liên kết.");
  try {
    const result = await api("/api/create", { method: "POST", body: JSON.stringify(payload()) });
    showReady(result.post);
    showToast("Bài đã được lưu cục bộ và kiểm tra thành công.");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function waitForLive(url) {
  for (let attempt = 1; attempt <= 36; attempt++) {
    $("#busy-message").textContent = `Đã đẩy lên GitHub. Đang chờ Cloudflare Pages (${attempt}/36)…`;
    try {
      const response = await fetch(`/api/check-live?url=${encodeURIComponent(url)}`, { cache: "no-store" });
      const result = await response.json();
      if (result.live) return true;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  return false;
}

async function publishPost() {
  setBusy(true, "Đang đăng bài lên website…", "Đang tạo commit riêng và đẩy lên GitHub.");
  try {
    const result = await api("/api/publish", { method: "POST", body: "{}" });
    const isLive = await waitForLive(result.post.url);
    $("#result-panel").hidden = false;
    $("#result-icon").textContent = isLive ? "✓" : "↑";
    $("#result-title").textContent = isLive ? "Bài đã lên website" : "Bài đã gửi tới Cloudflare";
    $("#result-message").textContent = isLive ? "Trang đã truy cập được. Bạn có thể sao chép liên kết để quảng bá ngay." : "Cloudflare đang triển khai lâu hơn bình thường. Liên kết dưới đây sẽ hoạt động khi quá trình hoàn tất.";
    $("#result-url").textContent = result.post.url;
    $("#result-preview").href = result.post.url;
    $("#publish-button").hidden = true;
    $("#copy-button").hidden = false;
    $("#copy-button").dataset.url = result.post.url;
    renderPending(null);
    state.pending = null;
    showToast(isLive ? "Đăng bài thành công." : "Đã đẩy bài lên GitHub; Cloudflare đang triển khai.");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function discardPost() {
  if (!confirm("Hủy bài đang chờ đăng và xóa các ảnh đã tạo?")) return;
  setBusy(true, "Đang hủy bản chờ đăng…", "Website cục bộ sẽ được dựng lại.");
  try {
    await api("/api/discard", { method: "POST", body: "{}" });
    state.pending = null;
    renderPending(null);
    $("#result-panel").hidden = true;
    showToast("Đã hủy bản chờ đăng.");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function initialize() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    const config = await response.json();
    state.token = config.token;
    state.maxImages = config.maxImages;
    state.maxImageBytes = config.maxImageBytes;
    if (config.imageOptimization) state.imageOptimization = { ...state.imageOptimization, ...config.imageOptimization };
    state.pending = config.pending;
    renderPending(config.pending);
  } catch (error) {
    showToast("Không kết nối được với trình đăng bài cục bộ. Hãy đóng và mở lại Dang-bai.bat.", true);
  }
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $("#date").value = local;
  updateType();
}

form.addEventListener("submit", savePost);
form.addEventListener("input", updatePreview);
document.querySelectorAll('input[name="type"]').forEach((input) => input.addEventListener("change", updateType));
$("#placement").addEventListener("change", () => { updatePlacement(); updatePreview(); });
const dropZone = $("#drop-zone");
dropZone.addEventListener("click", () => $("#image-input").click());
dropZone.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $("#image-input").click(); } });
dropZone.addEventListener("dragover", (event) => { event.preventDefault(); dropZone.classList.add("dragging"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
dropZone.addEventListener("drop", (event) => { event.preventDefault(); dropZone.classList.remove("dragging"); addFiles(event.dataTransfer.files); });
$("#image-input").addEventListener("change", (event) => addFiles(event.target.files));
$("#publish-button").addEventListener("click", publishPost);
$("#pending-publish").addEventListener("click", publishPost);
$("#pending-discard").addEventListener("click", discardPost);
$("#copy-button").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("#copy-button").dataset.url); showToast("Đã sao chép liên kết."); }
  catch (_) { showToast("Không tự sao chép được; hãy bôi đen đường dẫn và sao chép.", true); }
});

initialize();
