/**
 * Dashboard top-level tab switching (CP3.4).
 */
(function (global) {
  const ALLOWED = new Set(["overview", "pipeline", "pins", "content"]);
  const STORAGE_KEY = "dlh-dash-tab";

  function switchDashTab(tabId) {
    const id = ALLOWED.has(tabId) ? tabId : "overview";
    document.querySelectorAll(".dash-tab").forEach((btn) => {
      const on = btn.getAttribute("data-dash-tab") === id;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".dash-panel").forEach((panel) => {
      const on = panel.id === `dash-panel-${id}`;
      if (on) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch (_) {}
  }

  function initDashTabs() {
    document.querySelectorAll(".dash-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchDashTab(btn.getAttribute("data-dash-tab")));
    });
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) switchDashTab(saved);
    } catch (_) {}
  }

  global.DashTabs = { switchDashTab, initDashTabs };
  global.switchDashTab = switchDashTab;
})(typeof window !== "undefined" ? window : globalThis);
