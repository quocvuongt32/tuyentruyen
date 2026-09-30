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
    });
  }

  if (bottomBtn) {
    bottomBtn.addEventListener("click", () => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    });
  }
}

function setupCornerWidgets() {
  const widgets = document.getElementById("corner-widgets");
  if (!widgets) return;

  const togglePanel = (panelId) => {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const willOpen = panel.hidden;
    closeCornerPanels();
    panel.hidden = !willOpen;
  };

  const statsFab = document.getElementById("stats-fab");
  if (statsFab) statsFab.addEventListener("click", () => togglePanel("stats-panel"));

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
