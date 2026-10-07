function mergeManagedPosts(dynamicPosts, staticPosts, controls, type) {
  const relevantControls = (Array.isArray(controls) ? controls : []).filter((item) => item?.type === type);
  const controlMap = new Map(relevantControls.map((item) => [item.slug, item]));
  const managedSlugs = new Set((Array.isArray(dynamicPosts) ? dynamicPosts : []).map((item) => item?.slug).filter(Boolean));
  const addControl = (item) => {
    const value = controlMap.get(item.slug)?.displayOrder;
    return { ...item, displayOrder: value !== null && value !== undefined && Number.isInteger(Number(value)) ? Number(value) : null };
  };
  return [
    ...(Array.isArray(dynamicPosts) ? dynamicPosts : []).filter((item) => item?.slug && controlMap.get(item.slug)?.hidden !== true).map(addControl),
    ...(Array.isArray(staticPosts) ? staticPosts : []).filter((item) => item?.slug && !managedSlugs.has(item.slug) && controlMap.get(item.slug)?.hidden !== true).map(addControl),
  ].sort((left, right) => {
    const leftManaged = Number.isInteger(left.displayOrder);
    const rightManaged = Number.isInteger(right.displayOrder);
    if (leftManaged && rightManaged) return left.displayOrder - right.displayOrder;
    if (leftManaged !== rightManaged) return leftManaged ? -1 : 1;
    return 0;
  });
}

async function loadManagedSiteTexts() {
  try {
    const response = await fetch("/api/public/site-texts", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    for (const field of Array.isArray(payload.fields) ? payload.fields : []) {
      if (!field?.selector || typeof field.value !== "string") continue;
      document.querySelectorAll(field.selector).forEach((element) => {
        if (field.attribute === "placeholder") element.setAttribute("placeholder", field.value);
        else element.textContent = field.value;
      });
    }
  } catch (_) {}
}

async function loadSite() {
  try {
    const res = await fetch("data/site.json"); // revalidate qua ETag, xem loadEvents()
    if (!res.ok) throw new Error("Không tải được nội dung chung");
    const data = await res.json();

    const brand = data.brand || {};
    setText("brand-line1", brand.line1);
    setText("brand-line2", brand.line2);

    const nav = data.nav || {};
    setText("nav-trangchu", nav.trangChu);
    setText("nav-gioithieu", nav.gioiThieu);
    setText("nav-nguonchinhthong", nav.nguonChinhThong);
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
    const governingBody = footer.governingBody || "Học viện Cảnh sát nhân dân";
    const managingUnit = footer.managingUnit || "Khoa Toán - Tin học và Ứng dụng KHCN trong PCTP";
    setText("footer-governing-body", governingBody.toUpperCase());
    setText("footer-managing-unit", managingUnit.toUpperCase());
    setText("footer-site-name", (footer.siteName || "Website chuyên đề Cẩm nang An toàn số").toUpperCase());
    setText("footer-governing-body-detail", governingBody);
    setText("footer-managing-unit-detail", managingUnit);
    setText("footer-content-manager", footer.contentManager);
    setText("footer-technical-manager", footer.technicalManager);
    setText("footer-notice", footer.notice);
    setText("footer-status-notice", footer.statusNotice);
    for (const field of ["address", "email", "phone"]) {
      const value = String(footer[field] || "").trim();
      setText(`footer-${field}`, value);
      const row = document.getElementById(`footer-${field}-row`);
      if (row) row.hidden = !value;
    }
    const legalDisclaimer = document.getElementById("footer-legal-disclaimer");
    if (legalDisclaimer) {
      legalDisclaimer.textContent = footer.legalDisclaimer || "";
      legalDisclaimer.hidden = footer.legalDisclaimerApproved !== true || !legalDisclaimer.textContent;
    }
    const decision = document.getElementById("footer-decision");
    if (decision) {
      const number = String(footer.decisionNumber || "").trim();
      const date = String(footer.decisionDate || "").trim();
      decision.textContent = number ? `Thành lập theo Quyết định số ${number}${date ? ` ngày ${date}` : ""} của Học viện Cảnh sát nhân dân.` : "";
      decision.hidden = !number;
    }

    renderOfficialSources(data.officialSources);
  } catch (err) {
    console.error(err);
  }
}

async function loadAbout() {
  try {
    const res = await fetch("data/about.json"); // revalidate qua ETag, xem loadEvents()
    if (!res.ok) throw new Error("Không tải được nội dung Giới thiệu");
    const data = await res.json();

    const headingEl = document.getElementById("about-heading");
    if (headingEl && data.heading) headingEl.textContent = data.heading;

    const introEl = document.getElementById("about-intro");
    if (introEl) introEl.textContent = data.intro || "";

    const partnersEl = document.getElementById("about-partners");
    if (partnersEl) {
      partnersEl.innerHTML = "";
      (Array.isArray(data.partners) ? data.partners : []).forEach((p, index) => {
        const box = document.createElement("div");
        box.className = "partner-badge";
        const img = document.createElement("img");
        img.className = "badge-icon";
        img.src = p.icon;
        img.alt = "";
        img.loading = "lazy";
        const span = document.createElement("span");
        span.id = `about-partner-${index + 1}`;
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
      (Array.isArray(data.directives) ? data.directives : []).forEach((d, index) => {
        const li = document.createElement("li");
        li.id = `about-directive-${index + 1}`;
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

function buildSkillCard(s, gallery) {
  const destination = s.link || s.pageUrl || "";
  const card = document.createElement(destination ? "a" : "button");
  card.className = "skill-card";
  if (destination) {
    card.href = destination;
    if (s.link) {
      card.target = "_blank";
      card.rel = "noopener noreferrer";
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
      const list = Array.isArray(gallery) && gallery.length ? gallery : [s.image];
      openLightbox(s.image, list, list.indexOf(s.image));
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
  if (destination && !s.image) {
    const openHint = document.createElement("span");
    openHint.className = "skill-open-hint";
    openHint.textContent = s.link ? "Xem bài viết (mở tab mới) ↗" : "Đọc và chia sẻ bài viết →";
    body.appendChild(openHint);
  } else if (s.pageUrl) {
    const openHint = document.createElement("span");
    openHint.className = "skill-open-hint";
    openHint.textContent = "Mở trang riêng để chia sẻ →";
    body.appendChild(openHint);
  }
  card.appendChild(body);
  return card;
}

async function loadSkills() {
  const gridImage = document.getElementById("skills-grid-image");
  if (!gridImage) return;
  try {
    const [res, cloudResult] = await Promise.all([
      fetch("data/skills.json"),
      fetch("/api/public/posts?type=skill", { cache: "no-store" }).then((response) => response.ok ? response.json() : { posts: [] }).catch(() => ({ posts: [] })),
    ]);
    if (!res.ok) throw new Error("Không tải được Bộ kỹ năng An toàn số");
    const data = await res.json();
    const cloudSkills = Array.isArray(cloudResult.posts) ? cloudResult.posts : [];
    const staticSkills = Array.isArray(data.skills) ? data.skills : [];
    const skills = mergeManagedPosts(cloudSkills, staticSkills, cloudResult.controls, "skill");

    const imageSkills = skills.filter((s) => s.image);
    const imageSkillSrcs = imageSkills.map((s) => s.image);

    gridImage.innerHTML = "";
    if (!imageSkills.length) {
      gridImage.innerHTML = '<p class="empty">Đang cập nhật — chưa có infographic nào.</p>';
    } else {
      imageSkills.forEach((s) => gridImage.appendChild(buildSkillCard(s, imageSkillSrcs)));
    }

  } catch (err) {
    gridImage.innerHTML = '<p class="error">Chưa có dữ liệu hoặc lỗi tải dữ liệu.</p>';
    console.error(err);
  }
}

function renderOfficialSources(rawSources) {
  const grid = document.getElementById("official-sources-grid");
  if (!grid) return;
  const sources = Array.isArray(rawSources) ? rawSources : [];
  grid.innerHTML = "";

  for (const [index, source] of sources.entries()) {
    if (!source || !source.name || !/^https:\/\//i.test(source.url || "")) continue;
    const card = document.createElement("article");
    card.className = "official-source-card";

    const icon = document.createElement("span");
    icon.className = "official-source-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = source.icon === "academy" ? "HV" : source.icon === "cyber" ? "A05" : source.icon === "broadcast" ? "TV" : source.icon === "government" ? "CP" : "BCA";

    const title = document.createElement("h3");
    title.id = `official-source-${index + 1}-name`;
    title.textContent = source.name;
    const description = document.createElement("p");
    description.id = `official-source-${index + 1}-description`;
    description.textContent = source.description || "";
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Truy cập nguồn ↗";

    card.append(icon, title, description, link);
    grid.appendChild(card);
  }

  if (!grid.children.length) {
    grid.innerHTML = '<p class="empty">Danh mục liên kết đang được cập nhật.</p>';
  }
}

const TICKER_WEATHER_ICONS = [
  { codes: [0], icon: "☀️" },
  { codes: [1, 2], icon: "🌤️" },
  { codes: [3], icon: "☁️" },
  { codes: [45, 48], icon: "🌫️" },
  { codes: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], icon: "🌧️" },
  { codes: [71, 73, 75, 77, 85, 86], icon: "🌨️" },
  { codes: [95, 96, 99], icon: "⛈️" },
];

function tickerWeatherIcon(code) {
  return TICKER_WEATHER_ICONS.find((group) => group.codes.includes(Number(code)))?.icon || "🌤️";
}

function setupTickerClock() {
  const element = document.getElementById("ticker-datetime");
  if (!element) return;
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const update = () => {
    const label = formatter.format(new Date()).replace(/^./, (character) => character.toUpperCase());
    element.textContent = `${label} · GMT+7`;
    element.dateTime = new Date().toISOString();
  };
  update();
  window.setInterval(update, 30_000);
}

async function loadTickerWeather() {
  const icon = document.getElementById("ticker-weather-icon");
  const text = document.getElementById("ticker-weather-text");
  if (!icon || !text) return;
  try {
    const response = await fetch("/api/weather", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (typeof payload.temperature !== "number") throw new Error("Thiếu nhiệt độ");
    icon.textContent = tickerWeatherIcon(payload.weatherCode);
    text.textContent = `${payload.location || "Hà Nội"} ${payload.temperature.toFixed(1)}°C`;
  } catch (_) {
    icon.textContent = "🌤️";
    text.textContent = "Hà Nội · chưa cập nhật";
  }
}

function tickerDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "Bài mới";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function tickerPostLink(post) {
  if (typeof post.pageUrl === "string" && post.pageUrl.startsWith("/")) return post.pageUrl;
  return `/hoat-dong/${encodeURIComponent(post.slug)}/`;
}

function buildTickerPost(post, duplicate = false) {
  const link = document.createElement("a");
  link.className = "news-ticker-item";
  link.href = tickerPostLink(post);
  if (duplicate) {
    link.setAttribute("aria-hidden", "true");
    link.tabIndex = -1;
  }

  const date = document.createElement("span");
  date.className = "news-ticker-date";
  date.textContent = tickerDate(post.date);
  const title = document.createElement("span");
  title.textContent = post.title;
  link.append(date, title);
  return link;
}

async function loadSiteNewsTicker() {
  const track = document.getElementById("news-ticker-track");
  if (!track) return;
  const [staticPayload, cloudPayload] = await Promise.all([
    fetch("data/events.json").then((response) => response.ok ? response.json() : { events: [] }).catch(() => ({ events: [] })),
    fetch("/api/public/posts?type=event", { cache: "no-store" }).then((response) => response.ok ? response.json() : { posts: [] }).catch(() => ({ posts: [] })),
  ]);
  const merged = mergeManagedPosts(cloudPayload.posts, staticPayload.events, cloudPayload.controls, "event");
  const latest = merged
    .filter((post) => post?.slug && post?.title)
    .sort((left, right) => String(right.date || "").localeCompare(String(left.date || ""), "en"))
    .slice(0, 7);

  track.innerHTML = "";
  if (!latest.length) {
    const empty = document.createElement("span");
    empty.className = "news-ticker-loading";
    empty.textContent = "Chưa có bài mới để hiển thị.";
    track.appendChild(empty);
    track.style.animation = "none";
    return;
  }

  latest.forEach((post) => track.appendChild(buildTickerPost(post)));
  latest.forEach((post) => track.appendChild(buildTickerPost(post, true)));
  const characterCount = latest.reduce((total, post) => total + post.title.length, 0);
  track.style.setProperty("--ticker-duration", `${Math.max(60, Math.min(110, Math.round(characterCount * 0.18)))}s`);
}
