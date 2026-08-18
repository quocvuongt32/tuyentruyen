// Netlify gui link moi/quen mat khau ve trang goc (vd: "/#invite_token=...")
// nhung Identity widget chi duoc nap o /admin/. Neu khong chuyen huong, token
// nam yen tren trang chu va khong bao gio duoc xu ly -> tai khoan khong bao
// gio duoc xac nhan, du dat mat khau gi cung se bao "Email not confirmed".
(function redirectIdentityTokens() {
  if (/(invite_token|recovery_token|confirmation_token)=/.test(window.location.hash)) {
    window.location.replace("/admin/" + window.location.hash);
  }
})();

async function loadEvents() {
  const container = document.getElementById("timeline");
  try {
    const res = await fetch("data/events.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được dữ liệu sự kiện");
    const payload = await res.json();
    render(payload.events);
    renderStats(payload.stats, payload.generatedAt);
    setupBanner(payload.featured);
    setupCategoryFilter(payload.categories);
  } catch (err) {
    container.innerHTML = '<p class="error">Chưa có dữ liệu hoặc lỗi tải dữ liệu.</p>';
    console.error(err);
  }
}

// Hien so luot truy cap thuc te (GoatCounter). Can bat "Allow adding visitor
// counts on your website" trong Settings cua GoatCounter truoc, neu chua bat
// hoac loi mang thi lang le an tile nay di, khong lam vo trang.
async function loadVisitCounter() {
  const tile = document.getElementById("stat-visits-tile");
  const el = document.getElementById("stat-visits");
  if (!tile || !el) return;
  try {
    const res = await fetch("https://vuongnq.goatcounter.com/counter/TOTAL.json");
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.count) return;
    el.textContent = data.count;
    tile.hidden = false;
  } catch (err) {
    // Am lang bo qua - tile van an, khong anh huong phan con lai cua trang.
  }
}

function renderStats(stats, generatedAt) {
  const eventsEl = document.getElementById("stat-events");
  const imagesEl = document.getElementById("stat-images");
  const updatedEl = document.getElementById("stat-updated");
  if (!stats || !eventsEl) return;
  eventsEl.textContent = String(stats.eventCount || 0);
  imagesEl.textContent = String(stats.imageCount || 0);
  updatedEl.textContent = formatDate(generatedAt ? generatedAt.slice(0, 10) : "");
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
  if (ev.slug) article.id = `event-${ev.slug}`;
  if (ev.category) article.dataset.category = ev.category;

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
  if (ev.categoryLabel) {
    const catEl = document.createElement("span");
    catEl.className = "event-category";
    catEl.textContent = ev.categoryLabel;
    dateEl.appendChild(catEl);
  }
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
    if (willOpen) trackEvent(`/su-kien/${ev.slug || "khong-slug"}`, ev.title);
  });

  article.appendChild(summary);

  const panel = document.createElement("div");
  panel.className = "event-panel";
  panel.id = panelId;

  const panelInner = document.createElement("div");
  panelInner.className = "event-panel-inner";

  if (ev.videoEmbedUrl) {
    const videoWrap = document.createElement("div");
    videoWrap.className = "event-video";
    const iframe = document.createElement("iframe");
    iframe.src = ev.videoEmbedUrl;
    iframe.title = ev.title || "Video";
    iframe.loading = "lazy";
    iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    videoWrap.appendChild(iframe);
    panelInner.appendChild(videoWrap);
  } else if (ev.videoUrl) {
    const a = document.createElement("a");
    a.href = ev.videoUrl;
    a.className = "event-link";
    a.textContent = "Xem video →";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openLinkModal(ev.videoUrl);
    });
    panelInner.appendChild(a);
  }

  if (ev.link) {
    const a = document.createElement("a");
    a.href = ev.link;
    a.className = "event-link";
    a.textContent = "Xem bài viết tham khảo →";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openLinkModal(ev.link);
    });
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
    for (const item of ev.images) {
      const src = item && item.src;
      if (!src) continue;
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

function setupCategoryFilter(categories) {
  const wrap = document.getElementById("category-filter");
  if (!wrap) return;

  wrap.innerHTML = "";
  const cards = () => document.querySelectorAll("#timeline .event-card");

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "category-pill active";
  allBtn.textContent = "Tất cả";
  allBtn.dataset.value = "";
  wrap.appendChild(allBtn);

  (Array.isArray(categories) ? categories : []).forEach((c) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-pill";
    btn.textContent = c.label;
    btn.dataset.value = c.value;
    wrap.appendChild(btn);
  });

  wrap.querySelectorAll(".category-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".category-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const value = btn.dataset.value;
      cards().forEach((card) => {
        const match = !value || card.dataset.category === value;
        card.classList.toggle("filtered-out", !match);
      });
      trackEvent(`/loc/${value || "tat-ca"}`, btn.textContent);
    });
  });
}

function trackEvent(path, title) {
  if (window.goatcounter && typeof window.goatcounter.count === "function") {
    window.goatcounter.count({ path, title, event: true });
  }
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

function openLinkModal(url) {
  const overlay = document.getElementById("link-modal");
  const iframe = document.getElementById("link-modal-iframe");
  const openBtn = document.getElementById("link-modal-open");
  const titleEl = document.getElementById("link-modal-title");
  iframe.src = url;
  openBtn.href = url;
  titleEl.textContent = url;
  overlay.classList.add("active");
  trackEvent(`/lien-ket-tham-khao`, url);
}

function closeLinkModal() {
  const overlay = document.getElementById("link-modal");
  overlay.classList.remove("active");
  document.getElementById("link-modal-iframe").src = "about:blank";
}

function setupLinkModal() {
  const overlay = document.getElementById("link-modal");
  const closeBtn = document.getElementById("link-modal-close");
  if (!overlay || !closeBtn) return;

  closeBtn.addEventListener("click", closeLinkModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeLinkModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (overlay.classList.contains("active")) closeLinkModal();
    const lightbox = document.getElementById("lightbox");
    if (lightbox.classList.contains("active")) closeLightbox();
  });
}

function openEventCard(slug) {
  const card = document.getElementById(`event-${slug}`);
  if (!card) return;
  card.classList.add("open");
  const summary = card.querySelector(".event-summary");
  if (summary) summary.setAttribute("aria-expanded", "true");
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupBanner(featured) {
  const banner = document.getElementById("banner");
  const track = document.getElementById("banner-track");
  const dotsWrap = document.getElementById("banner-dots");
  if (!banner || !track || !dotsWrap) return;

  const slides = Array.isArray(featured) ? featured.filter((f) => f && f.src) : [];
  if (slides.length === 0) {
    banner.hidden = true;
    return;
  }

  track.innerHTML = "";
  dotsWrap.innerHTML = "";
  const slideEls = [];
  const dotEls = [];
  let index = 0;
  let timer = null;

  slides.forEach((item, i) => {
    const slide = document.createElement("a");
    slide.className = "banner-slide" + (i === 0 ? " active" : "");
    slide.href = item.eventSlug ? `#event-${item.eventSlug}` : "#timeline-section";

    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.eventTitle || "";
    img.loading = i === 0 ? "eager" : "lazy";
    slide.appendChild(img);

    if (item.eventTitle) {
      const caption = document.createElement("div");
      caption.className = "banner-caption";
      caption.innerHTML = `<strong></strong>`;
      caption.querySelector("strong").textContent = item.eventTitle;
      if (item.eventDate) {
        caption.appendChild(document.createTextNode(formatDate(item.eventDate)));
      }
      slide.appendChild(caption);
    }

    slide.addEventListener("click", (e) => {
      if (item.eventSlug) {
        e.preventDefault();
        openEventCard(item.eventSlug);
        trackEvent(`/banner/${item.eventSlug}`, item.eventTitle);
      }
    });

    track.appendChild(slide);
    slideEls.push(slide);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "banner-dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", `Ảnh ${i + 1}`);
    dot.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(dot);
    dotEls.push(dot);
  });

  banner.hidden = false;

  function goTo(i) {
    slideEls[index].classList.remove("active");
    dotEls[index].classList.remove("active");
    index = (i + slides.length) % slides.length;
    slideEls[index].classList.add("active");
    dotEls[index].classList.add("active");
  }

  function next() {
    goTo(index + 1);
  }

  function start() {
    if (slides.length > 1) timer = setInterval(next, 3000);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  banner.addEventListener("mouseenter", stop);
  banner.addEventListener("mouseleave", start);
  start();
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

  nav.querySelectorAll(":scope > a").forEach((link) => {
    link.addEventListener("click", () => {
      trackEvent(`/menu${link.getAttribute("href")}`, link.textContent.trim());
    });
  });
}

function setupAdminMenu() {
  const menu = document.getElementById("admin-menu");
  const toggle = document.getElementById("admin-toggle");
  const links = document.getElementById("admin-links");
  if (!menu || !toggle || !links) return;

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !links.classList.contains("open");
    links.classList.toggle("open", willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadEvents();
  loadVisitCounter();
  setupNav();
  setupAdminMenu();
  setupLinkModal();
  document.getElementById("lightbox").addEventListener("click", closeLightbox);
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
});
