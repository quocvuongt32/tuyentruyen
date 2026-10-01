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

// Nhay ve dung dinh #trang-chu se cuon khung thoi su (nam tren header, khong
// dinh sticky) ra khoi man hinh. Bam "Trang chu" (hoac logo) thi cuon thang
// len dau trang de van thay duoc dai tin.
function setupQuiz() {
  const form = document.getElementById("quiz-form");
  const result = document.getElementById("quiz-result");
  const retryBtn = document.getElementById("quiz-retry");
  if (!form || !result) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const questions = form.querySelectorAll(".quiz-question");
    let correct = 0;

    questions.forEach((q) => {
      const qid = q.dataset.qid;
      const correctVal = q.dataset.correct;
      const chosen = form.querySelector(`input[name="q${qid}"]:checked`);
      q.querySelectorAll("label").forEach((label) => {
        const input = label.querySelector("input");
        label.classList.remove("is-correct", "is-wrong");
        if (input.value === correctVal) {
          label.classList.add("is-correct");
        } else if (chosen && input.value === chosen.value) {
          label.classList.add("is-wrong");
        }
      });
      const explain = q.querySelector(".quiz-explain");
      if (explain) explain.hidden = false;
      if (chosen && chosen.value === correctVal) correct++;
    });

    const total = questions.length;
    let feedback;
    if (correct === total) {
      feedback = "Xuất sắc! Bạn đã nắm rất vững các kỹ năng an toàn số.";
    } else if (correct >= total * 0.7) {
      feedback = "Khá tốt! Xem lại phần giải thích để nắm chắc hơn các tình huống còn lại.";
    } else {
      feedback = "Bạn nên đọc kỹ Bộ kỹ năng An toàn số phía trên để trang bị thêm kiến thức nhé.";
    }

    result.querySelector(".quiz-score").textContent = `Bạn trả lời đúng ${correct}/${total} câu.`;
    result.querySelector(".quiz-feedback").textContent = feedback;
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "center" });

  });

  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      form.reset();
      form.querySelectorAll(".quiz-explain").forEach((el) => { el.hidden = true; });
      form.querySelectorAll("label").forEach((el) => el.classList.remove("is-correct", "is-wrong"));
      result.hidden = true;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function setupHomeLinks() {
  document.querySelectorAll('a[href="#trang-chu"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (history.pushState) history.pushState(null, "", "#trang-chu");
    });
  });
}

// Carousel ở vị trí logo lớn trong Hero: bắt đầu bằng huy hiệu, rồi chạy qua
// danh sách ảnh do quản trị viên cấu hình. HTML giữ sẵn danh sách cũ làm
// phương án dự phòng nếu API tạm thời không truy cập được.
//
// Cac anh Banner trong HTML dung data-src (khong phai src) - xem chu thich o
// index.html. primeSlide() gan src that khi sap toi luot anh do, nen khach chi
// luot qua trang chu chi tai 2-3 anh thay vi ca 15 anh (~1,8MB). Anh da gan
// src roi thi thoi, khong gan lai.
async function setupHeroCarousel() {
  const track = document.getElementById("hero-icon");
  if (!track) return;
  let intervalMs = 4000;
  try {
    const response = await fetch("/api/public/banner", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      const logo = track.querySelector('img[data-logo="true"]');
      if (logo && Array.isArray(data.images)) {
        logo.classList.remove("is-prev");
        logo.classList.add("is-active");
        track.replaceChildren(logo);
        data.images.forEach((item) => {
          if (!item?.src) return;
          const image = document.createElement("img");
          image.dataset.src = item.src;
          image.alt = item.caption || "";
          track.appendChild(image);
        });
      }
      const configuredInterval = Number(data.intervalMs);
      if (Number.isInteger(configuredInterval) && configuredInterval >= 2000 && configuredInterval <= 20000) {
        intervalMs = configuredInterval;
      }
    }
  } catch (_) {
    // Giữ danh sách ảnh có sẵn trong HTML nếu API tạm thời không phản hồi.
  }
  const slides = Array.from(track.querySelectorAll("img"));
  if (slides.length < 2) return;

  const primeSlide = (i) => {
    const img = slides[i];
    if (img && !img.getAttribute("src") && img.dataset.src) {
      img.src = img.dataset.src;
    }
  };

  let idx = slides.findIndex((img) => img.classList.contains("is-active"));
  if (idx < 0) idx = 0;

  primeSlide(idx);
  primeSlide((idx + 1) % slides.length);

  setInterval(() => {
    const prev = idx;
    idx = (idx + 1) % slides.length;
    primeSlide(idx);
    primeSlide((idx + 1) % slides.length); // nap truoc anh ke tiep de truot muot
    slides[prev].classList.remove("is-active");
    slides[prev].classList.add("is-prev");
    slides[idx].classList.add("is-active");
    setTimeout(() => slides[prev].classList.remove("is-prev"), 950);
  }, intervalMs);
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
