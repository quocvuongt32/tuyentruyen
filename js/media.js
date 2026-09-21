function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Danh sach anh dang xem trong lightbox + vi tri hien tai, de vuot/bam mui
// ten chuyen anh truoc/sau (kieu xem anh tren Windows). Gallery la tuy chon -
// mo 1 anh don le van hoat dong binh thuong (mui ten/dem an di).
let lightboxGallery = [];
let lightboxIndex = 0;

function updateLightboxView() {
  const img = document.getElementById("lightbox-img");
  const counter = document.getElementById("lightbox-counter");
  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");
  const multi = lightboxGallery.length > 1;

  img.src = lightboxGallery[lightboxIndex] || "";
  if (counter) {
    counter.hidden = !multi;
    counter.textContent = multi ? `${lightboxIndex + 1} / ${lightboxGallery.length}` : "";
  }
  if (prevBtn) prevBtn.hidden = !multi;
  if (nextBtn) nextBtn.hidden = !multi;
}

function openLightbox(src, gallery, index) {
  const overlay = document.getElementById("lightbox");
  if (Array.isArray(gallery) && gallery.length > 1) {
    lightboxGallery = gallery;
    const found = typeof index === "number" && index >= 0 ? index : gallery.indexOf(src);
    lightboxIndex = found >= 0 ? found : 0;
  } else {
    lightboxGallery = [src];
    lightboxIndex = 0;
  }
  updateLightboxView();
  overlay.classList.add("active");
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("active");
  document.getElementById("lightbox-img").src = "";
  lightboxGallery = [];
  lightboxIndex = 0;
}

function lightboxStep(delta) {
  if (lightboxGallery.length < 2) return;
  lightboxIndex = (lightboxIndex + delta + lightboxGallery.length) % lightboxGallery.length;
  updateLightboxView();
}

function setupLightbox() {
  const overlay = document.getElementById("lightbox");
  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");
  if (!overlay) return;

  overlay.addEventListener("click", closeLightbox);

  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      lightboxStep(-1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      lightboxStep(1);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (!overlay.classList.contains("active")) return;
    if (e.key === "ArrowLeft") lightboxStep(-1);
    if (e.key === "ArrowRight") lightboxStep(1);
  });

  // Vuot cham trai/phai de chuyen anh truoc/sau, giong xem nhieu anh tren
  // Windows. Nguong 50px + phai "ngang" ro rang hon "doc" de khong nham voi
  // cu chi cuon trang doc thong thuong.
  let touchStartX = 0;
  let touchStartY = 0;
  overlay.addEventListener("touchstart", (e) => {
    if (!e.touches || !e.touches.length) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  overlay.addEventListener("touchend", (e) => {
    if (!e.changedTouches || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      lightboxStep(dx > 0 ? -1 : 1);
    }
  }, { passive: true });
}

// Dong moi lop phu bang Escape. Lien ket ngoai khong con nap vao iframe;
// chung duoc mo o tab moi voi noopener/noreferrer ngay tai noi tao the <a>.
function setupOverlayKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const lightbox = document.getElementById("lightbox");
    if (lightbox && lightbox.classList.contains("active")) closeLightbox();
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
