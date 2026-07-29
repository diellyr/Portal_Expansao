import { isAuthenticated } from "./services/auth-service.js";
import { renderSidebar } from "./components/sidebar.js";
import { renderTopbar } from "./components/topbar.js";
import { refreshIcons } from "./utils/dom-utils.js";
import { SettingsRepository } from "./repositories/settings-repository.js";

/**
 * Mounts the shared shell (sidebar + topbar) for an internal page and guards
 * against unauthenticated access. Call this first from every pages/*.js entry point.
 */
export async function bootstrapPage({ activeKey, title, breadcrumbs }) {
  if (!isAuthenticated()) {
    window.location.href = "../index.html";
    return false;
  }

  renderSidebar(document.getElementById("sidebar"), activeKey);
  renderTopbar(document.getElementById("topbar"), { title, breadcrumbs });
  refreshIcons();

  await setupSidebarBehavior();
  return true;
}

async function setupSidebarBehavior() {
  const shell = document.getElementById("app-shell");
  const sidebar = document.getElementById("sidebar");
  const collapseToggle = document.getElementById("sidebar-collapse-toggle");
  const mobileToggle = document.getElementById("mobile-menu-toggle");

  const settings = await SettingsRepository.get();
  if (settings.sidebarCollapsed) shell.classList.add("sidebar-collapsed");

  collapseToggle?.addEventListener("click", async () => {
    shell.classList.toggle("sidebar-collapsed");
    await SettingsRepository.save({ ...settings, sidebarCollapsed: shell.classList.contains("sidebar-collapsed") });
  });

  let backdrop = document.getElementById("sidebar-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "sidebar-backdrop";
    backdrop.className = "sidebar-backdrop";
    document.body.appendChild(backdrop);
  }

  function closeMobileMenu() {
    sidebar.classList.remove("mobile-open");
    backdrop.classList.remove("visible");
  }

  mobileToggle?.addEventListener("click", () => {
    sidebar.classList.add("mobile-open");
    backdrop.classList.add("visible");
  });
  backdrop.addEventListener("click", closeMobileMenu);
}
