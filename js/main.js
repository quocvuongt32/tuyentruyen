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
  setupTickerClock();
  loadTickerWeather();
  loadSiteNewsTicker();
  window.setInterval(loadTickerWeather, 15 * 60 * 1000);
  Promise.allSettled([loadSite(), loadEvents(), loadAbout(), loadSkills()]).then(loadManagedSiteTexts);
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
  setupHomeLinks();
  setupQuiz();
  setupLightbox();
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
});
