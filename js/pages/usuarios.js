import { bootstrapPage } from "../app.js";
import { CityService } from "../services/city-service.js";
import { getCurrentUserProfile, isAdminProfile } from "../services/user-profile-service.js";
import { isSupabaseMode } from "../services/data-mode-service.js";
import { UserManagementService, USER_ROLES, findRole, roleRequiresCity } from "../services/user-management-service.js";
import { renderDataTable } from "../components/data-table.js";
import { openModal, confirmModal } from "../components/modal.js";
import { toast } from "../components/toast.js";
import { el, qs, refreshIcons } from "../utils/dom-utils.js";

const ok = await bootstrapPage({ activeKey: "usuarios", title: "Usuários" });
if (ok) init();

let cities = [];
let users = [];

async function init() {
  const profile = await getCurrentUserProfile();
  if (!isAdminProfile(profile)) {
    window.location.href = "dashboard.html";
    return;
  }

  if (!isSupabaseMode()) {
    qs("#usuarios-indexeddb-notice").hidden = false;
    qs("#usuarios-content").hidden = true;
    qs("#new-user-btn").disabled = true;
    refreshIcons();
    return;
  }

  cities = await CityService.list();
  qs("#new-user-btn").addEventListener("click", () => openUserForm());
  await loadAndRender();
}

async function loadAndRender() {
  try {
    users = await UserManagementService.listUsers();
  } catch (err) {
    toast.error(`Não foi possível carregar os usuários: ${err.message}`);
    users = [];
  }
  render();
}

function cityName(cidadeId) {
  if (!cidadeId) return "Todas as cidades";
  return cities.find((c) => c.id === cidadeId)?.nome || "Cidade não encontrada";
}

function render() {
  renderDataTable(qs("#users-table"), {
    columns: [
      { key: "email", label: "E-mail" },
      { key: "role", label: "Perfil", render: (r) => findRole(r.role)?.label || r.role },
      { key: "cidadeId", label: "Cidade", render: (r) => cityName(r.cidadeId) },
      { key: "createdAt", label: "Criado em", render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString("pt-BR") : "—") },
    ],
    rows: users,
    actions: (row) => [
      { icon: "pencil", label: "Editar perfil", onClick: () => openUserForm(row) },
      { icon: "user-x", label: "Remover acesso", onClick: () => removeUser(row) },
    ],
    emptyMessage: "Nenhum usuário cadastrado ainda.",
  });
  refreshIcons();
}

function openUserForm(existing) {
  const isEdit = !!existing;

  const roleSelect = el(
    "select",
    { id: "field-role", class: "form-control" },
    USER_ROLES.map((r) => new Option(r.label, r.value, false, existing?.role === r.value))
  );
  const cityGroup = el("div", { class: "form-group", id: "city-field-group" }, [
    el("label", { for: "field-cidade", class: "required" }, "Cidade"),
    el(
      "select",
      { id: "field-cidade", class: "form-control" },
      cities.map((c) => new Option(c.nome, c.id, false, existing?.cidadeId === c.id))
    ),
  ]);
  const roleDescription = el("p", { class: "text-muted", id: "role-description", style: "margin-top: var(--space-1);" }, findRole(existing?.role || USER_ROLES[0].value)?.description || "");

  function syncCityVisibility() {
    const requiresCity = roleRequiresCity(roleSelect.value);
    cityGroup.hidden = !requiresCity;
    roleDescription.textContent = findRole(roleSelect.value)?.description || "";
  }
  roleSelect.addEventListener("change", syncCityVisibility);

  const formFields = [
    el("div", { class: "form-group" }, [
      el("label", { for: "field-email", class: "required" }, "E-mail"),
      el("input", {
        type: "email",
        id: "field-email",
        class: "form-control",
        value: existing?.email || "",
        disabled: isEdit ? true : undefined,
      }),
    ]),
  ];
  if (!isEdit) {
    formFields.push(
      el("div", { class: "form-group" }, [
        el("label", { for: "field-password", class: "required" }, "Senha temporária"),
        el("input", { type: "text", id: "field-password", class: "form-control", placeholder: "Repasse esta senha para a pessoa" }),
      ])
    );
  }
  formFields.push(
    el("div", { class: "form-group" }, [el("label", { for: "field-role" }, "Perfil"), roleSelect, roleDescription]),
    cityGroup
  );

  const form = el("form", { novalidate: true }, formFields);
  syncCityVisibility();

  const { close } = openModal({
    title: isEdit ? `Editar perfil — ${existing.email}` : "Novo usuário",
    body: form,
    actions: [
      { label: "Cancelar", className: "btn btn-secondary" },
      {
        label: "Salvar",
        className: "btn btn-primary",
        closeOnClick: false,
        onClick: async () => {
          const role = qs("#field-role", form).value;
          const cidadeId = roleRequiresCity(role) ? qs("#field-cidade", form).value : null;

          if (roleRequiresCity(role) && !cidadeId) {
            toast.error("Selecione a cidade para esse perfil.");
            return;
          }

          try {
            if (isEdit) {
              await UserManagementService.updateUserProfile(existing.userId, { role, cidadeId });
              toast.success("Perfil atualizado.");
            } else {
              const email = qs("#field-email", form).value.trim();
              const password = qs("#field-password", form).value;
              if (!email || !password) {
                toast.error("Preencha e-mail e senha.");
                return;
              }
              await UserManagementService.createUser({ email, password, role, cidadeId });
              toast.success(`Usuário ${email} criado com sucesso.`);
            }
            close();
            await loadAndRender();
          } catch (err) {
            toast.error(`Não foi possível salvar: ${err.message}`);
          }
        },
      },
    ],
  });
}

async function removeUser(row) {
  const confirmed = await confirmModal({
    title: "Remover acesso",
    message: `Remover o perfil de <strong>${row.email}</strong>? A pessoa perde acesso a todos os dados imediatamente. A conta de login em si continua existindo no Supabase (Authentication → Users) — para excluí-la de vez, use o painel do Supabase.`,
    confirmLabel: "Remover",
    danger: true,
  });
  if (!confirmed) return;
  try {
    await UserManagementService.removeUserProfile(row.userId);
    toast.success("Acesso removido.");
    await loadAndRender();
  } catch (err) {
    toast.error(`Não foi possível remover: ${err.message}`);
  }
}

refreshIcons();
