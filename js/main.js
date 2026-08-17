async function loadEvents() {
  const container = document.getElementById("timeline");
  try {
    const res = await fetch("data/events.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được dữ liệu sự kiện");
    const events = await res.json();
    render(events);
  } catch (err) {
    container.innerHTML = '<p class="error">Chưa có dữ liệu hoặc lỗi tải dữ liệu.</p>';
    console.error(err);
  }
}

function render(events) {
  const container = document.getElementById("timeline");
  container.innerHTML = "";
  if (!Array.isArray(events) || events.length === 0) {
    container.innerHTML = '<p class="empty">Chưa có sự kiện nào được đăng.</p>';
    return;
  }
  for (const ev of events) {
    container.appendChild(buildCard(ev));
  }
}

function buildCard(ev) {
  const article = document.createElement("article");
  article.className = "event-card";

  const dot = document.createElement("div");
  dot.className = "event-dot";
  article.appendChild(dot);

  const content = document.createElement("div");
  content.className = "event-content";

  const dateEl = document.createElement("div");
  dateEl.className = "event-date";
  dateEl.textContent = formatDate(ev.date);
  content.appendChild(dateEl);

  const titleEl = document.createElement("h2");
  titleEl.className = "event-title";
  titleEl.textContent = ev.title || "";
  content.appendChild(titleEl);

  if (ev.location) {
    const locEl = document.createElement("div");
    locEl.className = "event-location";
    locEl.textContent = `\u{1F4CD} ${ev.location}`;
    content.appendChild(locEl);
  }

  if (ev.bodyHtml) {
    const bodyEl = document.createElement("div");
    bodyEl.className = "event-body";
    // bodyHtml is escaped + whitelisted at build time (see scripts/build-events.js)
    bodyEl.innerHTML = ev.bodyHtml;
    content.appendChild(bodyEl);
  }

  if (Array.isArray(ev.images) && ev.images.length) {
    const gallery = document.createElement("div");
    gallery.className = "event-gallery";
    for (const src of ev.images) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = ev.title || "";
      img.loading = "lazy";
      img.addEventListener("click", () => openLightbox(src));
      gallery.appendChild(img);
    }
    content.appendChild(gallery);
  }

  if (ev.link) {
    const a = document.createElement("a");
    a.href = ev.link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "event-link";
    a.textContent = "Xem bài viết tham khảo →";
    content.appendChild(a);
  }

  article.appendChild(content);
  return article;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function openLightbox(src) {
  const overlay = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  img.src = src;
  overlay.classList.add("active");
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("active");
  document.getElementById("lightbox-img").src = "";
}

document.addEventListener("DOMContentLoaded", () => {
  loadEvents();
  document.getElementById("lightbox").addEventListener("click", closeLightbox);
});
