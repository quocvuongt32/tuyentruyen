function closeCornerPanels() {
  document.querySelectorAll(".corner-panel").forEach((panel) => {
    panel.hidden = true;
  });
}

function setupScrollButtons() {
  const topBtn = document.getElementById("scroll-top-fab");
  const bottomBtn = document.getElementById("scroll-bottom-fab");

  if (topBtn) {
    topBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      trackEvent("/cuon-len-dau-trang", "Cuộn lên đầu trang");
    });
  }

  if (bottomBtn) {
    bottomBtn.addEventListener("click", () => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      trackEvent("/cuon-xuong-cuoi-trang", "Cuộn xuống cuối trang");
    });
  }
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

// Gui form góp ý qua Web3Forms. Form bản tin dùng Pages Function riêng ở
// setupNewsletterForm() để lưu contact thật vào Resend.
function wireWeb3Form(opts) {
  const form = document.getElementById(opts.formId);
  const submitBtn = document.getElementById(opts.submitId);
  const note = document.getElementById(opts.noteId);
  if (!form || !submitBtn || !note) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    note.hidden = true;

    const payload = Object.fromEntries(new FormData(form).entries());

    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (!data || !data.success) throw new Error("Gửi thất bại");
        note.textContent = opts.okText;
        note.hidden = false;
        form.reset();
        trackEvent(opts.trackPath, opts.trackTitle);
      })
      .catch(() => {
        note.textContent = opts.errText;
        note.hidden = false;
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });
}

function setupFeedbackForm() {
  wireWeb3Form({
    formId: "feedback-form",
    submitId: "feedback-submit",
    noteId: "feedback-note",
    okText: "Cảm ơn bạn đã góp ý! Chúng tôi đã ghi nhận.",
    errText: "Gửi không thành công, vui lòng thử lại sau.",
    trackPath: "/hom-thu-gop-y",
    trackTitle: "Gửi góp ý",
  });
}

function setupNewsletterForm() {
  const form = document.getElementById("newsletter-form");
  const submitBtn = document.getElementById("newsletter-submit");
  const note = document.getElementById("newsletter-note");
  if (!form || !submitBtn || !note) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    note.hidden = true;

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const res = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Đăng ký thất bại");
      note.textContent = "Đăng ký thành công! Email của bạn đã được thêm vào danh sách nhận bản tin.";
      note.hidden = false;
      form.reset();
      trackEvent("/dang-ky-ban-tin", "Đăng ký bản tin");
    } catch (err) {
      note.textContent = "Đăng ký chưa thành công. Vui lòng thử lại sau.";
      note.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}
