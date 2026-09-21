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
  setInterval(loadVisitCounter, 60 * 1000);
  loadTicker();
  setupTickerClock();
  loadTickerWeather();
  setInterval(loadTickerWeather, 15 * 60 * 1000);
  setupNav();
  setupHeroCarousel();
  setupHeaderCategoryLinks();
  setupAdminMenu();
  setupThemeToggle();
  setupOverlayKeyboard();
  setupActivityModal();
  setupMediaLibrary();
  setupScrollButtons();
  setupCornerWidgets();
  setupFeedbackForm();
  setupHomeLinks();
  setupExtraTracking();
  setupQuiz();
  setupNewsletterForm();
  setupLightbox();
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
});
