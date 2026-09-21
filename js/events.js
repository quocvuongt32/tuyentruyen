// Tra cuu su kien theo slug (dung cho banner an noi bat - can biet su kien
// nam o timeline Tuyen truyen hay o luoi Hoat dong khac de mo dung cho).
let eventsBySlug = {};
let allEvents = [];

const ANM_CATEGORY = "an-ninh-mang";

async function loadEvents() {
  const container = document.getElementById("timeline");
  try {
    // Khong dung { cache: "no-store" } nua: Netlify tra ETag + max-age=0,
    // must-revalidate cho file tinh, nen trinh duyet gui request co dieu kien
    // va nhan 304 (khong ton bang thong) khi noi dung khong doi. Moi lan deploy
    // ETag doi -> tu dong tai ban moi. Tiet kiem bang thong cho khach quay lai
    // va cho moi lan F5. Xem docs/DEPLOYMENT.md muc "Giam bang thong".
    const res = await fetch("data/events.json");
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

// GoatCounter dem luot xem qua script rieng (count.js, tai async) - luot xem
// CUA CHINH TRANG DANG MO co the chua kip cong vao TOTAL.json tai thoi diem
// gong nay chay (race condition), nen +1 "lac quan" de tinh luot dang xem
// hien tai, khong phai so gia. Goi lai dinh ky de con so "song" hon (van
// mien phi, GoatCounter khong tinh phi theo so lan goi API dem cong khai).
async function loadVisitCounter() {
  try {
    const res = await fetch("https://vuongnq.goatcounter.com/counter/TOTAL.json");
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.count) return;
    const raw = Number(String(data.count).replace(/[^\d]/g, ""));
    setAllText("js-stat-visits", Number.isFinite(raw) ? raw + 1 : data.count);
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
  const allSrcs = images.map((it) => it.src);
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
    img.addEventListener("click", () => openLightbox(coverSrc, allSrcs, 0));
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
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.addEventListener("click", () => trackEvent("/lien-ket-video", ev.videoUrl));
    frag.appendChild(a);
  }

  if (ev.link) {
    const a = document.createElement("a");
    a.href = ev.link;
    a.className = "event-link";
    a.textContent = "Xem bài viết tham khảo →";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.addEventListener("click", () => trackEvent("/lien-ket-tham-khao", ev.link));
    frag.appendChild(a);
  }

  if (ev.bodyHtml) {
    const bodyEl = document.createElement("div");
    bodyEl.className = "event-body";
    // bodyHtml is escaped + whitelisted at build time (see scripts/build-events.js)
    bodyEl.innerHTML = ev.bodyHtml;
    frag.appendChild(bodyEl);
  }

  if (ev.slug && !ev.slug.startsWith("feed-")) {
    const pageLink = document.createElement("a");
    pageLink.href = `/hoat-dong/${encodeURIComponent(ev.slug)}/`;
    pageLink.className = "event-link event-page-link";
    pageLink.textContent = "Mở trang riêng để chia sẻ →";
    pageLink.addEventListener("click", () => trackEvent(`/mo-bai/${ev.slug}`, ev.title));
    frag.appendChild(pageLink);
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
      img.addEventListener("click", () => openLightbox(src, allSrcs, allSrcs.indexOf(src)));
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
  // Bo qua su kien tu dong lay tu feed hvcsnd.edu.vn (slug bat dau "feed-") -
  // Thu vien anh & video chi hien anh/video that do don vi tu nhap, khong lan
  // anh minh hoa tin tuc chung chung. allEvents da sap theo ngay giam dan tu
  // build-events.js nen khong can sort lai o day.
  for (const ev of allEvents) {
    if (ev.slug && ev.slug.startsWith("feed-")) continue;
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

  const imageSrcs = items.filter((it) => it.type === "image").map((it) => it.src);

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
      btn.addEventListener("click", () => openLightbox(item.src, imageSrcs, imageSrcs.indexOf(item.src)));
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

    btn.title = item.ev.title || "";
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
