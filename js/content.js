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
    const skills = [...cloudSkills, ...staticSkills].filter((skill, index, list) => skill?.slug && list.findIndex((item) => item?.slug === skill.slug) === index);

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

  for (const source of sources) {
    if (!source || !source.name || !/^https:\/\//i.test(source.url || "")) continue;
    const card = document.createElement("article");
    card.className = "official-source-card";

    const icon = document.createElement("span");
    icon.className = "official-source-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = source.icon === "academy" ? "HV" : source.icon === "cyber" ? "A05" : source.icon === "broadcast" ? "TV" : source.icon === "government" ? "CP" : "BCA";

    const title = document.createElement("h3");
    title.textContent = source.name;
    const description = document.createElement("p");
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
