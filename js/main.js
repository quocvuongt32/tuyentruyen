// Netlify gui link moi/quen mat khau ve trang goc (vd: "/#invite_token=...")
// nhung Identity widget chi duoc nap o /admin/. Neu khong chuyen huong, token
// nam yen tren trang chu va khong bao gio duoc xu ly -> tai khoan khong bao
// gio duoc xac nhan, du dat mat khau gi cung se bao "Email not confirmed".
(function redirectIdentityTokens() {
  if (/(invite_token|recovery_token|confirmation_token)=/.test(window.location.hash)) {
    window.location.replace("/admin/" + window.location.hash);
  }
})();

// Tra cuu su kien theo slug (dung cho banner an noi bat - can biet su kien
// nam o timeline Tuyen truyen hay o luoi Hoat dong khac de mo dung cho).
let eventsBySlug = {};
let allEvents = [];

const ANM_CATEGORY = "an-ninh-mang";

async function loadEvents() {
  const container = document.getElementById("timeline");
  try {
    const res = await fetch("data/events.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được dữ liệu sự kiện");
    const payload = await res.json();
    const events = Array.isArray(payload.events) ? payload.events : [];

    eventsBySlug = {};
    events.forEach((ev) => {
      if (ev.slug) eventsBySlug[ev.slug] = ev;
    });
    allEvents = events;

    const anmEvents = events.filter((ev) => ev.category === ANM_CATEGORY);
    const otherEvents = events.filter((ev) => ev.category !== ANM_CATEGORY);
    const otherCategories = (payload.categories || []).filter((c) => c.value !== ANM_CATEGORY);

    render(anmEvents);
    renderActivityGrid(otherEvents);
    renderStats(payload.stats, payload.generatedAt);
    setupBanner(payload.featured);
    setupCategoryFilter(otherCategories);
  } catch (err) {
    container.innerHTML = '<p class="error">Chưa có dữ liệu hoặc lỗi tải dữ liệu.</p>';
    console.error(err);
  }
}

// Hien so luot truy cap thuc te (GoatCounter). O canh se hien san voi dau
// "—", chi cap nhat so khi lay duoc du lieu. Can bat "Allow adding visitor
// counts on your website" trong Settings cua GoatCounter de co so nay.
function setAllText(className, value) {
  document.querySelectorAll(`.${className}`).forEach((el) => {
    el.textContent = value;
  });
}

async function loadVisitCounter() {
  try {
    const res = await fetch("https://vuongnq.goatcounter.com/counter/TOTAL.json");
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.count) return;
    setAllText("js-stat-visits", data.count);
  } catch (err) {
    // Am lang bo qua - tile van hien dau "—", khong anh huong phan con lai cua trang.
  }
}

function renderStats(stats, generatedAt) {
  if (!stats) return;
  setAllText("js-stat-events", String(stats.eventCount || 0));
  setAllText("js-stat-images", String(stats.imageCount || 0));
  setAllText("js-stat-updated", formatDate(generatedAt ? generatedAt.slice(0, 10) : ""));
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
  panelInner.appendChild(buildDetailFragment(ev));

  panel.appendChild(panelInner);
  article.appendChild(panel);

  return article;
}

function buildDetailFragment(ev) {
  const frag = document.createDocumentFragment();
  const images = Array.isArray(ev.images) ? ev.images.filter((it) => it && it.src) : [];
  let galleryImages = images;

  // Uu tien video lam anh bia (da rat truc quan); neu khong co video thi
  // dung anh dau tien lam anh bia lon, cac anh con lai xep thanh dai duoi
  // than bai; neu chua co gi thi hien khung giu cho thay vi de trong.
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
    frag.appendChild(videoWrap);
  } else if (images.length) {
    const cover = document.createElement("div");
    cover.className = "event-cover";
    const coverSrc = images[0].src;
    const img = document.createElement("img");
    img.src = coverSrc;
    img.alt = ev.title || "";
    img.loading = "lazy";
    img.addEventListener("click", () => openLightbox(coverSrc));
    cover.appendChild(img);
    frag.appendChild(cover);
    galleryImages = images.slice(1);
  }

  if (ev.planNumber) {
    const plan = document.createElement("p");
    plan.className = "event-plan-number";
    plan.textContent = `Kế hoạch: ${ev.planNumber}`;
    frag.appendChild(plan);
  }

  if (ev.videoUrl && !ev.videoEmbedUrl) {
    const a = document.createElement("a");
    a.href = ev.videoUrl;
    a.className = "event-link";
    a.textContent = "Xem video →";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openLinkModal(ev.videoUrl);
    });
    frag.appendChild(a);
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
    frag.appendChild(a);
  }

  if (ev.bodyHtml) {
    const bodyEl = document.createElement("div");
    bodyEl.className = "event-body";
    // bodyHtml is escaped + whitelisted at build time (see scripts/build-events.js)
    bodyEl.innerHTML = ev.bodyHtml;
    frag.appendChild(bodyEl);
  }

  if (galleryImages.length) {
    const gallery = document.createElement("div");
    gallery.className = "event-gallery";
    for (const item of galleryImages) {
      const src = item && item.src;
      if (!src) continue;
      const img = document.createElement("img");
      img.src = src;
      img.alt = ev.title || "";
      img.loading = "lazy";
      img.addEventListener("click", () => openLightbox(src));
      gallery.appendChild(img);
    }
    frag.appendChild(gallery);
  }

  return frag;
}

function renderActivityGrid(events) {
  const container = document.getElementById("activity-grid");
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(events) || events.length === 0) {
    container.innerHTML = '<p class="empty">Chưa có hoạt động nào ở mục này.</p>';
    return;
  }
  events.forEach((ev) => container.appendChild(buildActivityCard(ev)));
}

function buildActivityCard(ev) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "activity-card";
  if (ev.slug) card.id = `activity-${ev.slug}`;
  if (ev.category) card.dataset.category = ev.category;

  const firstImage = Array.isArray(ev.images) ? ev.images.find((im) => im && im.src) : null;
  if (firstImage) {
    const img = document.createElement("img");
    img.className = "activity-thumb";
    img.src = firstImage.src;
    img.alt = ev.title || "";
    img.loading = "lazy";
    img.addEventListener("error", () => { img.remove(); }, { once: true });
    card.appendChild(img);
  }

  const body = document.createElement("div");
  body.className = "activity-body";

  if (ev.categoryLabel) {
    const cat = document.createElement("div");
    cat.className = "activity-cat";
    cat.textContent = ev.categoryLabel;
    body.appendChild(cat);
  }

  const title = document.createElement("h3");
  title.className = "activity-title";
  title.textContent = ev.title || "";
  body.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "activity-meta";
  meta.textContent = [formatDate(ev.date), ev.location].filter(Boolean).join(" · ");
  body.appendChild(meta);

  card.appendChild(body);

  card.addEventListener("click", () => {
    openActivityModal(ev);
    trackEvent(`/hoat-dong/${ev.slug || "khong-slug"}`, ev.title);
  });

  return card;
}

function openActivityModal(ev) {
  const overlay = document.getElementById("activity-modal");
  const content = document.getElementById("activity-modal-content");
  if (!overlay || !content) return;

  content.innerHTML = "";

  const dateEl = document.createElement("div");
  dateEl.className = "event-date";
  dateEl.textContent = formatDate(ev.date);
  if (ev.categoryLabel) {
    const catEl = document.createElement("span");
    catEl.className = "event-category";
    catEl.textContent = ev.categoryLabel;
    dateEl.appendChild(catEl);
  }
  content.appendChild(dateEl);

  const titleEl = document.createElement("h3");
  titleEl.className = "event-title";
  titleEl.textContent = ev.title || "";
  content.appendChild(titleEl);

  if (ev.location) {
    const locEl = document.createElement("div");
    locEl.className = "event-location";
    locEl.textContent = `\u{1F4CD} ${ev.location}`;
    content.appendChild(locEl);
  }

  content.appendChild(buildDetailFragment(ev));

  overlay.classList.add("active");
}

function closeActivityModal() {
  const overlay = document.getElementById("activity-modal");
  if (overlay) overlay.classList.remove("active");
}

function setupActivityModal() {
  const overlay = document.getElementById("activity-modal");
  const closeBtn = document.getElementById("activity-modal-close");
  if (!overlay || !closeBtn) return;

  closeBtn.addEventListener("click", closeActivityModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeActivityModal();
  });
}

function collectMediaItems() {
  const items = [];
  for (const ev of allEvents) {
    if (Array.isArray(ev.images)) {
      for (const img of ev.images) {
        if (img && img.src) items.push({ type: "image", src: img.src, ev });
      }
    }
    if (ev.videoUrl) {
      const thumb = Array.isArray(ev.images) && ev.images[0] ? ev.images[0].src : null;
      items.push({ type: "video", thumb, ev });
    }
  }
  return items;
}

function buildMediaLibrary() {
  const grid = document.getElementById("media-library-grid");
  if (!grid) return;
  const items = collectMediaItems();
  grid.innerHTML = "";

  if (!items.length) {
    grid.innerHTML = '<p class="empty">Chưa có ảnh hoặc video nào.</p>';
    return;
  }

  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "media-library-item";

    if (item.type === "image") {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.ev.title || "";
      img.loading = "lazy";
      btn.appendChild(img);
      btn.addEventListener("click", () => openLightbox(item.src));
    } else {
      if (item.thumb) {
        const img = document.createElement("img");
        img.src = item.thumb;
        img.alt = item.ev.title || "";
        img.loading = "lazy";
        btn.appendChild(img);
      }
      const play = document.createElement("span");
      play.className = "media-library-item-play";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("width", "34");
      svg.setAttribute("height", "34");
      svg.setAttribute("fill", "currentColor");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M8 5.5v13l11-6.5-11-6.5Z");
      svg.appendChild(path);
      play.appendChild(svg);
      btn.appendChild(play);
      btn.addEventListener("click", () => {
        closeMediaLibrary();
        openActivityModal(item.ev);
      });
    }

    const caption = document.createElement("span");
    caption.className = "media-library-item-caption";
    caption.textContent = item.ev.title || "";
    btn.appendChild(caption);

    grid.appendChild(btn);
  });
}

function openMediaLibrary() {
  const overlay = document.getElementById("media-library-modal");
  if (!overlay) return;
  buildMediaLibrary();
  overlay.classList.add("active");
  trackEvent("/thu-vien-anh-video", "Thư viện ảnh & video");
}

function closeMediaLibrary() {
  const overlay = document.getElementById("media-library-modal");
  if (overlay) overlay.classList.remove("active");
}

function setupMediaLibrary() {
  const tiles = document.querySelectorAll(".js-stat-media-tile");
  const overlay = document.getElementById("media-library-modal");
  const closeBtn = document.getElementById("media-library-close");
  if (!tiles.length || !overlay || !closeBtn) return;

  tiles.forEach((tile) => {
    tile.addEventListener("click", () => {
      closeCornerPanels();
      openMediaLibrary();
    });
  });
  closeBtn.addEventListener("click", closeMediaLibrary);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeMediaLibrary();
  });
}

// Loc luoi "Hoat dong khac" theo danh muc - dung chung cho ca pill trong
// muc do lan link rut gon tren thanh dieu huong (setupHeaderCategoryLinks).
function applyActivityFilter(value, label) {
  const wrap = document.getElementById("category-filter");
  if (wrap) {
    wrap.querySelectorAll(".category-pill").forEach((b) => {
      b.classList.toggle("active", (b.dataset.value || "") === (value || ""));
    });
  }
  document.querySelectorAll("#activity-grid .activity-card").forEach((card) => {
    const match = !value || card.dataset.category === value;
    card.classList.toggle("filtered-out", !match);
  });
  trackEvent(`/loc/${value || "tat-ca"}`, label || value || "Tất cả");
}

function setupCategoryFilter(categories) {
  const wrap = document.getElementById("category-filter");
  if (!wrap) return;

  wrap.innerHTML = "";

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
    btn.addEventListener("click", () => applyActivityFilter(btn.dataset.value, btn.textContent));
  });
}

// Cac link rut gon tren thanh dieu huong (Chuyen doi so/Doi moi sang tao/...)
// vua cuon xuong muc "Hoat dong khac" vua tu ap dung bo loc tuong ung, thay
// vi chi cuon toi roi nguoi dung phai tu bam lai pill ben duoi.
function setupHeaderCategoryLinks() {
  document.querySelectorAll("#site-nav a[data-activity-filter]").forEach((link) => {
    link.addEventListener("click", () => {
      const value = link.dataset.activityFilter;
      // Doi 1 nhip de #hoat-dong-khac-section kip cuon toi truoc khi doi pill,
      // tranh giat lien tuc neu trinh duyet dang xu ly hanh vi cuon cua <a href>.
      setTimeout(() => applyActivityFilter(value, link.textContent), 50);
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
    const activityModal = document.getElementById("activity-modal");
    if (activityModal && activityModal.classList.contains("active")) closeActivityModal();
    const mediaLibrary = document.getElementById("media-library-modal");
    if (mediaLibrary && mediaLibrary.classList.contains("active")) closeMediaLibrary();
    closeCornerPanels();
  });
}

function openEventCard(slug) {
  const ev = eventsBySlug[slug];
  if (ev && ev.category !== ANM_CATEGORY) {
    openActivityModal(ev);
    return;
  }
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
    img.addEventListener("error", () => img.remove(), { once: true });
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

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      trackEvent(`/menu${link.getAttribute("href")}`, link.textContent.trim());
    });
  });
}

function setupNavMore() {
  const wrap = document.getElementById("nav-more");
  const toggle = document.getElementById("nav-more-toggle");
  const links = document.getElementById("nav-more-links");
  if (!wrap || !toggle || !links) return;

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !links.classList.contains("open");
    links.classList.toggle("open", willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) {
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

// Nhay ve dung dinh #trang-chu se cuon khung thoi su (nam tren header, khong
// dinh sticky) ra khoi man hinh. Bam "Trang chu" (hoac logo) thi cuon thang
// len dau trang de van thay duoc dai tin.
function setupHomeLinks() {
  document.querySelectorAll('a[href="#trang-chu"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (history.pushState) history.pushState(null, "", "#trang-chu");
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

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

// Bo icon co san cho cac "diem noi bat" trong muc Gioi thieu — CMS chi cho
// chon ten (khong cho dan SVG tuy y) de giu giao dien nhat quan.
const ABOUT_ICON_PATHS = {
  shield: ["M12 2.5 4.5 5.5v5.4c0 5.1 3.3 9 7.5 10.6 4.2-1.6 7.5-5.5 7.5-10.6V5.5L12 2.5Z"],
  bulb: ["M9 18h6M10 21h4", "M12 3a6 6 0 0 0-3.5 10.9c.4.3.7.8.7 1.3v.3h5.6v-.3c0-.5.3-1 .7-1.3A6 6 0 0 0 12 3Z"],
  refresh: ["M20 12a8 8 0 1 1-2.34-5.66", "M20 4v5h-5"],
  doc: ["M7 3h7l4 4v14H7V3Z", "M14 3v4h4", "M9.5 12.5h5M9.5 15.5h5"],
  computer: ["M4 5h16v10H4V5Z", "M9 19h6M12 15v4"],
  star: ["m12 3 2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.1 1.4-6.3-4.8-4.3 6.4-.6L12 3Z"],
};

function buildAboutIcon(key) {
  const paths = ABOUT_ICON_PATHS[key] || ABOUT_ICON_PATHS.shield;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "22");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  paths.forEach((d) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  });
  return svg;
}

function setText(id, value) {
  if (!value) return;
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// Header, hero, tieu de muc, footer deu da co san chu dung trong HTML (de
// khong bi trang rong/FOUC neu fetch loi hoac cham) — ham nay chi GHI DE
// bang noi dung tu CMS khi tai xong, khong bat buoc.
async function loadSite() {
  try {
    const res = await fetch("data/site.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được nội dung chung");
    const data = await res.json();

    const brand = data.brand || {};
    setText("brand-line1", brand.line1);
    setText("brand-line2", brand.line2);

    const nav = data.nav || {};
    setText("nav-trangchu", nav.trangChu);
    setText("nav-gioithieu", nav.gioiThieu);
    setText("nav-tuyentruyen", nav.tuyenTruyen);
    setText("nav-hoatdongkhac", nav.hoatDongKhac);
    setText("nav-lienhe", nav.lienHe);

    const hero = data.hero || {};
    setText("hero-title", hero.title);
    setText("hero-subtitle", hero.subtitle);
    setText("hero-cta-text", hero.ctaText);

    const timelineSection = data.timelineSection || {};
    setText("timeline-heading", timelineSection.heading);
    setText("timeline-hint", timelineSection.hint);

    const activitySection = data.activitySection || {};
    setText("activity-heading", activitySection.heading);
    setText("activity-hint", activitySection.hint);

    const footer = data.footer || {};
    setText("footer-line1", footer.line1);
    setText("footer-line2", footer.line2);

    // Tieu de hero co the doi -> can do lai be rong logo cho khop.
    syncHeroIconWidth();
  } catch (err) {
    console.error(err);
  }
}

async function loadAbout() {
  try {
    const res = await fetch("data/about.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được nội dung Giới thiệu");
    const data = await res.json();

    const headingEl = document.getElementById("about-heading");
    if (headingEl && data.heading) headingEl.textContent = data.heading;

    const introEl = document.getElementById("about-intro");
    if (introEl) introEl.textContent = data.intro || "";

    const partnersEl = document.getElementById("about-partners");
    if (partnersEl) {
      partnersEl.innerHTML = "";
      (Array.isArray(data.partners) ? data.partners : []).forEach((p) => {
        const box = document.createElement("div");
        box.className = "partner-badge";
        const img = document.createElement("img");
        img.className = "badge-icon";
        img.src = p.icon;
        img.alt = "";
        img.loading = "lazy";
        const span = document.createElement("span");
        span.textContent = p.text;
        box.appendChild(img);
        box.appendChild(span);
        partnersEl.appendChild(box);
      });
    }

    const pointsEl = document.getElementById("about-points");
    if (pointsEl) {
      pointsEl.innerHTML = "";
      (Array.isArray(data.points) ? data.points : []).forEach((p) => {
        const box = document.createElement("div");
        box.className = "point";
        const iconWrap = document.createElement("span");
        iconWrap.className = "point-icon";
        iconWrap.setAttribute("aria-hidden", "true");
        iconWrap.appendChild(buildAboutIcon(p.icon));
        const span = document.createElement("span");
        span.textContent = p.text;
        box.appendChild(iconWrap);
        box.appendChild(span);
        pointsEl.appendChild(box);
      });
    }

    const directiveTitleEl = document.getElementById("about-directive-title");
    if (directiveTitleEl && data.directiveTitle) directiveTitleEl.textContent = data.directiveTitle;

    const directiveListEl = document.getElementById("about-directive-list");
    if (directiveListEl) {
      directiveListEl.innerHTML = "";
      (Array.isArray(data.directives) ? data.directives : []).forEach((d) => {
        const li = document.createElement("li");
        const strong = document.createElement("strong");
        strong.textContent = d.title;
        li.appendChild(strong);
        li.appendChild(document.createTextNode(` ${d.date ? `(${d.date}) ` : ""}${d.description || ""}`));
        directiveListEl.appendChild(li);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

function buildSkillCard(s) {
  const card = document.createElement(s.link ? "a" : "button");
  card.className = "skill-card";
  if (s.link) {
    card.href = s.link;
    if (!s.image) {
      // Muc chi co link (bai viet tham khao): mo thang tab moi, khong qua
      // modal iframe - nhieu trang chinh thong (.gov.vn...) tu chan nhung
      // bang X-Frame-Options, khien modal trong/treo, kem thuyet phuc.
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      card.addEventListener("click", () => trackEvent(`/ky-nang/${s.slug}`, s.title));
    } else {
      card.addEventListener("click", (e) => {
        e.preventDefault();
        openLinkModal(s.link);
      });
    }
  } else {
    card.type = "button";
  }

  if (s.image) {
    const img = document.createElement("img");
    img.className = "skill-thumb";
    img.src = s.image;
    img.alt = s.title || "";
    img.loading = "lazy";
    img.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLightbox(s.image);
    });
    img.addEventListener("error", () => { img.remove(); }, { once: true });
    card.appendChild(img);
  }

  const body = document.createElement("div");
  body.className = "skill-body";
  const title = document.createElement("h3");
  title.className = "skill-title";
  title.textContent = s.title || "";
  body.appendChild(title);
  if (s.summary) {
    const summary = document.createElement("p");
    summary.className = "skill-summary";
    summary.textContent = s.summary;
    body.appendChild(summary);
  }
  if (s.link && !s.image) {
    const openHint = document.createElement("span");
    openHint.className = "skill-open-hint";
    openHint.textContent = "Xem bài viết (mở tab mới) ↗";
    body.appendChild(openHint);
  }
  card.appendChild(body);
  return card;
}

async function loadSkills() {
  const gridImage = document.getElementById("skills-grid-image");
  const gridLink = document.getElementById("skills-grid-link");
  if (!gridImage || !gridLink) return;
  try {
    const res = await fetch("data/skills.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được Bộ kỹ năng An toàn số");
    const data = await res.json();
    const skills = Array.isArray(data.skills) ? data.skills : [];

    const imageSkills = skills.filter((s) => s.image);
    const linkSkills = skills.filter((s) => !s.image && s.link);

    gridImage.innerHTML = "";
    if (!imageSkills.length) {
      gridImage.innerHTML = '<p class="empty">Đang cập nhật — chưa có infographic nào.</p>';
    } else {
      imageSkills.forEach((s) => gridImage.appendChild(buildSkillCard(s)));
    }

    gridLink.innerHTML = "";
    if (!linkSkills.length) {
      gridLink.innerHTML = '<p class="empty">Đang cập nhật — chưa có bài viết nào.</p>';
    } else {
      linkSkills.forEach((s) => gridLink.appendChild(buildSkillCard(s)));
    }
  } catch (err) {
    gridImage.innerHTML = '<p class="error">Chưa có dữ liệu hoặc lỗi tải dữ liệu.</p>';
    gridLink.innerHTML = "";
    console.error(err);
  }
}

// Ma thoi tiet (Open-Meteo WMO code) -> icon don gian, gom nhom theo tinh chat.
const WEATHER_ICONS = [
  { codes: [0], icon: "☀️" },
  { codes: [1, 2], icon: "🌤️" },
  { codes: [3], icon: "☁️" },
  { codes: [45, 48], icon: "🌫️" },
  { codes: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], icon: "🌧️" },
  { codes: [71, 73, 75, 77, 85, 86], icon: "🌨️" },
  { codes: [95, 96, 99], icon: "⛈️" },
];

function weatherIconFor(code) {
  const match = WEATHER_ICONS.find((g) => g.codes.includes(code));
  return match ? match.icon : "🌤️";
}

function setupTickerClock() {
  const el = document.getElementById("ticker-datetime");
  if (!el) return;

  const fmt = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  function tick() {
    const parts = fmt.formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type)?.value || "";
    const weekday = get("weekday");
    const label = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    el.textContent = `${label}, ${get("day")}/${get("month")}/${get("year")}, ${get("hour")}:${get("minute")}:${get("second")} GMT+7`;
  }

  tick();
  setInterval(tick, 1000);
}

async function loadTickerWeather() {
  const wrap = document.getElementById("ticker-weather");
  const iconEl = document.getElementById("ticker-weather-icon");
  const textEl = document.getElementById("ticker-weather-text");
  if (!wrap || !iconEl || !textEl) return;

  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,weather_code&timezone=Asia%2FBangkok",
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("Không tải được thời tiết");
    const payload = await res.json();
    const temp = payload?.current?.temperature_2m;
    const code = payload?.current?.weather_code;
    if (typeof temp !== "number") throw new Error("Thiếu dữ liệu nhiệt độ");

    iconEl.textContent = weatherIconFor(code);
    textEl.textContent = `Hà Nội ${temp.toFixed(1)}°C`;
    wrap.hidden = false;
  } catch (e) {
    wrap.hidden = true;
  }
}

let tickerItems = [];

async function loadTicker() {
  const wrap = document.getElementById("news-ticker");
  const track = document.getElementById("news-ticker-track");
  const panelList = document.getElementById("news-panel-list");

  try {
    const res = await fetch("data/ticker.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được tin");
    const payload = await res.json();
    const items = Array.isArray(payload.items) ? payload.items.filter((it) => it && it.title && it.url) : [];
    tickerItems = items;

    if (!items.length) {
      if (panelList) panelList.innerHTML = '<p class="empty">Chưa có tin nào.</p>';
      return;
    }

    if (wrap && track) {
      const buildItem = (it) => {
        const a = document.createElement("a");
        a.className = "news-ticker-item";
        a.href = it.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";

        const src = document.createElement("span");
        src.className = "news-ticker-source";
        src.textContent = it.source || "";

        const title = document.createElement("span");
        title.textContent = it.title;

        a.appendChild(src);
        a.appendChild(title);
        a.addEventListener("click", () => trackEvent("/tin-lien-quan", it.title));
        return a;
      };

      // Nhan doi danh sach de vong lap CSS (translateX -50%) khong bi giat.
      items.forEach((it) => track.appendChild(buildItem(it)));
      items.forEach((it) => track.appendChild(buildItem(it)));
      wrap.hidden = false;
    }

    renderNewsPanel();
  } catch (e) {
    if (panelList) panelList.innerHTML = '<p class="empty">Không tải được tin lúc này.</p>';
    // Khong tai duoc thi giu an dai tin chay, khong lam hong trang.
  }
}

function renderNewsPanel() {
  const panelList = document.getElementById("news-panel-list");
  if (!panelList) return;
  panelList.innerHTML = "";

  if (!tickerItems.length) {
    panelList.innerHTML = '<p class="empty">Chưa có tin nào.</p>';
    return;
  }

  tickerItems.forEach((it) => {
    const a = document.createElement("a");
    a.className = "news-panel-item";
    a.href = it.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const source = document.createElement("span");
    source.className = "news-panel-item-source";
    source.textContent = it.source || "";

    const title = document.createElement("span");
    title.className = "news-panel-item-title";
    title.textContent = it.title;

    a.appendChild(source);
    a.appendChild(title);

    if (it.date) {
      const date = document.createElement("span");
      date.className = "news-panel-item-date";
      date.textContent = formatDate(it.date);
      a.appendChild(date);
    }

    a.addEventListener("click", () => trackEvent("/tin-lien-quan", it.title));
    panelList.appendChild(a);
  });
}

function closeCornerPanels() {
  document.querySelectorAll(".corner-panel").forEach((panel) => {
    panel.hidden = true;
  });
}

function setupCornerWidgets() {
  const widgets = document.getElementById("corner-widgets");
  if (!widgets) return;

  const togglePanel = (panelId, btn) => {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const willOpen = panel.hidden;
    closeCornerPanels();
    panel.hidden = !willOpen;
    if (willOpen) {
      trackEvent(`/widget/${panelId}`, btn ? btn.title : panelId);
    }
  };

  const statsFab = document.getElementById("stats-fab");
  const newsFab = document.getElementById("news-fab");
  const feedbackFab = document.getElementById("feedback-fab");
  if (statsFab) statsFab.addEventListener("click", () => togglePanel("stats-panel", statsFab));
  if (newsFab) newsFab.addEventListener("click", () => togglePanel("news-panel", newsFab));
  if (feedbackFab) feedbackFab.addEventListener("click", () => togglePanel("feedback-panel", feedbackFab));

  widgets.querySelectorAll("[data-close-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(btn.dataset.closePanel);
      if (panel) panel.hidden = true;
    });
  });

  document.addEventListener("click", (e) => {
    if (!widgets.contains(e.target)) closeCornerPanels();
  });
}

function setupFeedbackForm() {
  const form = document.getElementById("feedback-form");
  const submitBtn = document.getElementById("feedback-submit");
  const note = document.getElementById("feedback-note");
  if (!form || !submitBtn || !note) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    note.hidden = true;

    const body = new URLSearchParams(new FormData(form)).toString();

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Gửi thất bại");
        note.textContent = "Cảm ơn bạn đã góp ý! Chúng tôi đã ghi nhận.";
        note.hidden = false;
        form.reset();
        trackEvent("/hom-thu-gop-y", "Gửi góp ý");
      })
      .catch(() => {
        note.textContent = "Gửi không thành công, vui lòng thử lại sau.";
        note.hidden = false;
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });
}

// Be rong logo bang dung chieu dai dong chu "Cam nang An toan so" (theo yeu
// cau thiet ke), do lai moi khi kich thuoc man hinh thay doi vi font co-scale
// theo vw.
function syncHeroIconWidth() {
  const icon = document.getElementById("hero-icon");
  const title = document.getElementById("hero-title");
  if (!icon || !title) return;

  // h1 la block nen getBoundingClientRect tra ve be rong ca khoi (bang container),
  // khong phai be rong chu that. Dung Range de do dung phan chu da render.
  let width = 0;
  const textNode = title.firstChild;
  if (textNode && textNode.nodeType === Node.TEXT_NODE) {
    const range = document.createRange();
    range.selectNodeContents(textNode);
    width = range.getBoundingClientRect().width;
  }
  if (!width) width = title.getBoundingClientRect().width;

  if (width > 0) icon.style.width = `${Math.round(width)}px`;
}

function setupHeroIconSync() {
  syncHeroIconWidth();
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(syncHeroIconWidth, 120);
  });
}

function setupThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    if (isLight) {
      document.documentElement.removeAttribute("data-theme");
      try { localStorage.setItem("theme", "dark"); } catch (e) {}
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      try { localStorage.setItem("theme", "light"); } catch (e) {}
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSite();
  loadEvents();
  loadAbout();
  loadSkills();
  loadVisitCounter();
  loadTicker();
  setupTickerClock();
  loadTickerWeather();
  setInterval(loadTickerWeather, 15 * 60 * 1000);
  setupNav();
  setupNavMore();
  setupHeaderCategoryLinks();
  setupAdminMenu();
  setupThemeToggle();
  setupLinkModal();
  setupActivityModal();
  setupMediaLibrary();
  setupCornerWidgets();
  setupFeedbackForm();
  setupHeroIconSync();
  setupHomeLinks();
  document.getElementById("lightbox").addEventListener("click", closeLightbox);
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
});
