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
  events.forEach((ev, i) => {
    container.appendChild(buildCard(ev, i === 0));
  });
}

function buildCard(ev, openByDefault) {
  const article = document.createElement("article");
  article.className = "event-card" + (openByDefault ? " open" : "");

  const dot = document.createElement("div");
  dot.className = "event-dot";
  article.appendChild(dot);

  const panelId = `event-panel-${Math.random().toString(36).slice(2, 9)}`;

  const summary = document.createElement("button");
  summary.type = "button";
  summary.className = "event-summary";
  summary.setAttribute("aria-expanded", String(openByDefault));
  summary.setAttribute("aria-controls", panelId);

  const summaryText = document.createElement("div");
  summaryText.className = "event-summary-text";

  const dateEl = document.createElement("div");
  dateEl.className = "event-date";
  dateEl.textContent = formatDate(ev.date);
  summaryText.appendChild(dateEl);

  const titleEl = document.createElement("h3");
  titleEl.className = "event-title";
  titleEl.textContent = ev.title || "";
  summaryText.appendChild(titleEl);

  if (ev.location) {
    const locEl = document.createElement("div");
    locEl.className = "event-location";
    locEl.textContent = `\u{1F4CD} ${ev.location}`;
    summaryText.appendChild(locEl);
  }

  summary.appendChild(summaryText);

  const chevron = document.createElement("span");
  chevron.className = "toggle-icon";
  chevron.setAttribute("aria-hidden", "true");
  chevron.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  summary.appendChild(chevron);

  summary.addEventListener("click", () => {
    const willOpen = !article.classList.contains("open");
    article.classList.toggle("open", willOpen);
    summary.setAttribute("aria-expanded", String(willOpen));
  });

  article.appendChild(summary);

  const panel = document.createElement("div");
  panel.className = "event-panel";
  panel.id = panelId;

  const panelInner = document.createElement("div");
  panelInner.className = "event-panel-inner";

  if (ev.link) {
    const a = document.createElement("a");
    a.href = ev.link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "event-link";
    a.textContent = "Xem bài viết tham khảo →";
    panelInner.appendChild(a);
  }

  if (ev.bodyHtml) {
    const bodyEl = document.createElement("div");
    bodyEl.className = "event-body";
    // bodyHtml is escaped + whitelisted at build time (see scripts/build-events.js)
    bodyEl.innerHTML = ev.bodyHtml;
    panelInner.appendChild(bodyEl);
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
    panelInner.appendChild(gallery);
  }

  panel.appendChild(panelInner);
  article.appendChild(panel);

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

function setupNav() {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const willOpen = !nav.classList.contains("open");
    nav.classList.toggle("open", willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadEvents();
  setupNav();
  document.getElementById("lightbox").addEventListener("click", closeLightbox);
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
});
