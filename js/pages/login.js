import { login, isAuthenticated } from "../services/auth-service.js";
import { APP_VERSION } from "../config/constants.js";
import { qs, refreshIcons } from "../utils/dom-utils.js";
import { t } from "../services/i18n-service.js";
import { openForgotPasswordModal } from "../components/forgot-password-modal.js";

if (isAuthenticated()) {
  window.location.href = "pages/dashboard.html";
}

qs("#app-version").textContent = `v${APP_VERSION}`;
qs("#login-subtitle").textContent = t("app.subtitle");
qs("#label-email").textContent = t("login.email");
qs("#label-password").textContent = t("login.password");
qs("#login-submit-label").textContent = t("login.enter");
refreshIcons();

const form = qs("#login-form");
const emailInput = qs("#email");
const passwordInput = qs("#password");
const emailError = qs("#email-error");
const passwordError = qs("#password-error");
const submitBtn = qs("#login-submit");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  emailError.textContent = "";
  passwordError.textContent = "";

  if (!emailInput.value.trim()) {
    emailError.textContent = "Informe o e-mail.";
    return;
  }
  if (!passwordInput.value) {
    passwordError.textContent = "Informe a senha.";
    return;
  }

  submitBtn.disabled = true;
  const result = await login(emailInput.value, passwordInput.value);
  if (result.ok) {
    window.location.href = "pages/dashboard.html";
  } else {
    submitBtn.disabled = false;
    passwordError.textContent = result.error;
  }
});

qs("#forgot-password-link").addEventListener("click", (event) => {
  event.preventDefault();
  openForgotPasswordModal();
});
