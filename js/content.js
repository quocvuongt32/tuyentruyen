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
    setText("footer-notice", footer.notice);
    setText("footer-status-notice", footer.statusNotice);
    const decision = document.getElementById("footer-decision");
    if (decision) {
      const number = String(footer.decisionNumber || "").trim();
      const date = String(footer.decisionDate || "").trim();
      decision.textContent = number ? `Thành lập theo Quyết định số ${number}${date ? ` ngày ${date}` : ""} của Học viện Cảnh sát nhân dân.` : "";
      decision.hidden = !number;
    }
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
    card.addEventListener("click", () => trackEvent(`/ky-nang/${s.slug}`, s.title));
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
      trackEvent(`/ky-nang/${s.slug}`, s.title);
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
  const gridLink = document.getElementById("skills-grid-link");
  if (!gridImage || !gridLink) return;
  try {
    const res = await fetch("data/skills.json"); // revalidate qua ETag, xem loadEvents()
    if (!res.ok) throw new Error("Không tải được Bộ kỹ năng An toàn số");
    const data = await res.json();
    const skills = Array.isArray(data.skills) ? data.skills : [];

    const imageSkills = skills.filter((s) => s.image);
    const linkSkills = skills.filter((s) => !s.image && (s.link || s.pageUrl));
    const imageSkillSrcs = imageSkills.map((s) => s.image);

    gridImage.innerHTML = "";
    if (!imageSkills.length) {
      gridImage.innerHTML = '<p class="empty">Đang cập nhật — chưa có infographic nào.</p>';
    } else {
      imageSkills.forEach((s) => gridImage.appendChild(buildSkillCard(s, imageSkillSrcs)));
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
let officialNewsPromise = null;
const QUICK_NEWS_FALLBACK_ITEMS = [
  {
    title: "Cảnh báo tình trạng quay trở lại thủ đoạn cắt ghép hình ảnh nhạy cảm nhằm cưỡng đoạt tài sản",
    summary: "Cục A05 khuyến cáo người dân hạn chế công khai dữ liệu cá nhân, cảnh giác trước nội dung giả mạo và báo ngay cơ quan Công an khi bị đe dọa, cưỡng đoạt tài sản.",
    url: "https://www.bocongan.gov.vn/bai-viet/canh-bao-tinh-trang-quay-tro-lai-thu-doan-cat-ghep-hinh-anh-nhay-cam-nham-cuong-doat-tai-san-1788770637",
    source: "Cục A05 - Bộ Công an",
    date: "2026-09-07",
  },
  {
    title: "Học viện Cảnh sát nhân dân khai giảng năm học 2026 - 2027",
    summary: "Học viện xác định tiếp tục đổi mới giáo dục, đào tạo, nghiên cứu khoa học, đẩy mạnh khoa học công nghệ và chuyển đổi số trong năm học mới.",
    url: "https://hvcsnd.edu.vn/hoc-vien-canh-sat-nhan-dan-khai-giang-nam-hoc-2026-2027-14204",
    source: "Học viện CSND",
    date: "2026-09-05",
  },
  {
    title: "Phát động chuỗi hoạt động Ngày An ninh mạng Việt Nam năm 2026",
    summary: "Hoạt động do Ban Chỉ đạo An ninh mạng quốc gia phối hợp Bộ Công an tổ chức, hướng tới một không gian mạng an toàn, lành mạnh và nhân văn cho mỗi người.",
    url: "https://www.bocongan.gov.vn/bai-viet/phat-dong-chuoi-hoat-dong-ngay-an-ninh-mang-viet-nam-nam-2026-vi-mot-khong-gian-mang-nhan-van-cho-moi-nguoi-1785988798",
    source: "Cục A05 - Bộ Công an",
    date: "2026-08-06",
  },
  {
    title: "Học viện CSND và UBND tỉnh Lai Châu tăng cường phối hợp ứng dụng khoa học, công nghệ trong phòng, chống tội phạm",
    summary: "Hai đơn vị ký thỏa thuận hợp tác về ứng dụng khoa học công nghệ, đổi mới sáng tạo và chuyển đổi số trong đấu tranh phòng, chống tội phạm.",
    url: "https://hvcsnd.edu.vn/hoc-vien-csnd-va-ubnd-tinh-lai-chau-tang-cuong-phoi-hop-ung-dung-khoa-hoc-cong-nghe-trong-phong-chong-toi-pham-14149",
    source: "Học viện CSND",
    date: "2026-08-07",
  },
];

function getOfficialNews() {
  if (officialNewsPromise) return officialNewsPromise;
  officialNewsPromise = (async () => {
    try {
      const response = await fetch("/api/quick-news", { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.items) || !payload.items.length) throw new Error("Nguồn tin trống");
      return { ...payload, fallback: false };
    } catch (_) {
      return {
        generatedAt: "",
        items: QUICK_NEWS_FALLBACK_ITEMS,
        stats: [],
        sources: [
          { name: "Cục A05 - Bộ Công an", url: "https://www.bocongan.gov.vn/tag/1259", ok: false },
          { name: "Học viện CSND", url: "https://hvcsnd.edu.vn/tin-tuc-su-kien", ok: false },
        ],
        fallback: true,
      };
    }
  })();
  return officialNewsPromise;
}

function quickNewsDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00+07:00`);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function externalNewsLink(className, item) {
  const link = document.createElement("a");
  link.className = className;
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

async function loadQuickNews() {
  const grid = document.getElementById("quick-news-grid");
  const updated = document.getElementById("quick-news-updated");
  const status = updated?.closest(".quick-news-status");
  if (!grid) return;

  try {
    const payload = await getOfficialNews();
    const items = payload.items.filter((item) => item && item.title && item.url).slice(0, 4);
    grid.innerHTML = "";

    items.forEach((item) => {
      const card = externalNewsLink("quick-news-card", item);
      const source = document.createElement("span");
      source.className = "quick-news-source";
      source.textContent = item.source || "Nguồn bài gốc";
      const title = document.createElement("h3");
      title.textContent = item.title;
      const summary = document.createElement("p");
      summary.textContent = item.summary || "Mở bài viết gốc để xem nội dung chi tiết.";
      const meta = document.createElement("span");
      meta.className = "quick-news-meta";
      meta.textContent = [quickNewsDate(item.date), "Mở nguồn gốc ↗"].filter(Boolean).join(" · ");
      card.append(source, title, summary, meta);
      card.addEventListener("click", () => trackEvent("/tin-nhanh", item.title));
      grid.appendChild(card);
    });

    if (!items.length) grid.innerHTML = '<p class="empty">Chưa có tin phù hợp.</p>';

    if (updated) {
      const timestamp = payload.generatedAt ? new Date(payload.generatedAt) : null;
      const label = timestamp && !Number.isNaN(timestamp.getTime())
        ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(timestamp)
        : "gần đây";
      updated.textContent = payload.fallback ? "Đang dùng dữ liệu dự phòng" : `Cập nhật ${label}`;
      status?.classList.toggle("is-fallback", payload.fallback === true);
    }
  } catch (error) {
    grid.innerHTML = '<p class="empty">Chưa thể tải tin nhanh lúc này. Vui lòng thử lại sau.</p>';
    if (updated) updated.textContent = "Tạm thời gián đoạn";
    status?.classList.add("is-fallback");
  }
}

async function loadTicker() {
  const wrap = document.getElementById("news-ticker");
  const track = document.getElementById("news-ticker-track");
  const panelList = document.getElementById("news-panel-list");

  try {
    const payload = await getOfficialNews();
    const items = Array.isArray(payload.items) ? payload.items.filter((it) => it && it.title && it.url) : [];
    tickerItems = items;

    if (!items.length) {
      if (panelList) panelList.innerHTML = '<p class="empty">Chưa có tin nào.</p>';
      return;
    }

    if (wrap && track) {
      track.innerHTML = "";
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
