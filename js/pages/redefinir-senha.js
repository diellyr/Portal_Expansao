import { qs, refreshIcons } from "../utils/dom-utils.js";
import { getSupabaseClient } from "../database/supabase-client.js";

refreshIcons();

const loadingEl = qs("#redefinir-loading");
const formEl = qs("#redefinir-form");
const invalidEl = qs("#redefinir-invalid");
const successEl = qs("#redefinir-success");

function show(target) {
  [loadingEl, formEl, invalidEl, successEl].forEach((el) => {
    el.hidden = el !== target;
  });
}

async function init() {
  let client;
  try {
    client = await getSupabaseClient();
  } catch {
    show(invalidEl);
    return;
  }

  let resolved = false;

  // O link do e-mail carrega um token de recuperação na URL; supabase-js
  // detecta isso automaticamente ao criar o cliente (detectSessionInUrl,
  // ligado por padrão) e emite este evento assim que a sessão temporária
  // de recuperação é criada.
  client.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY" && !resolved) {
      resolved = true;
      show(formEl);
    }
  });

  const { data } = await client.auth.getSession();
  if (!resolved && data?.session) {
    resolved = true;
    show(formEl);
  }

  setTimeout(() => {
    if (!resolved) show(invalidEl);
  }, 2500);
}

init();

qs("#redefinir-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const newPasswordInput = qs("#new-password");
  const confirmInput = qs("#confirm-password");
  const newPasswordError = qs("#new-password-error");
  const confirmError = qs("#confirm-password-error");
  newPasswordError.textContent = "";
  confirmError.textContent = "";

  if (newPasswordInput.value.length < 6) {
    newPasswordError.textContent = "A senha deve ter pelo menos 6 caracteres.";
    return;
  }
  if (newPasswordInput.value !== confirmInput.value) {
    confirmError.textContent = "A confirmação não confere com a nova senha.";
    return;
  }

  const submitBtn = qs("#redefinir-submit");
  submitBtn.disabled = true;
  try {
    const client = await getSupabaseClient();
    const { error } = await client.auth.updateUser({ password: newPasswordInput.value });
    if (error) throw new Error(error.message);
    await client.auth.signOut();
    show(successEl);
  } catch (err) {
    submitBtn.disabled = false;
    confirmError.textContent = err.message;
  }
});
