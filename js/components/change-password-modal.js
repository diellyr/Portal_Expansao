import { el, qs } from "../utils/dom-utils.js";
import { openModal } from "./modal.js";
import { toast } from "./toast.js";
import { getSupabaseClient } from "../database/supabase-client.js";
import { getSession } from "../services/auth-service.js";

export function openChangePasswordModal() {
  const form = el("form", { novalidate: true }, [
    el("div", { class: "form-group" }, [
      el("label", { for: "current-password", class: "required" }, "Senha atual"),
      el("input", { type: "password", id: "current-password", class: "form-control", autocomplete: "current-password" }),
    ]),
    el("div", { class: "form-group" }, [
      el("label", { for: "new-password", class: "required" }, "Nova senha"),
      el("input", { type: "password", id: "new-password", class: "form-control", autocomplete: "new-password" }),
    ]),
    el("div", { class: "form-group" }, [
      el("label", { for: "confirm-password", class: "required" }, "Confirmar nova senha"),
      el("input", { type: "password", id: "confirm-password", class: "form-control", autocomplete: "new-password" }),
    ]),
  ]);

  const { close } = openModal({
    title: "Alterar senha",
    body: form,
    actions: [
      { label: "Cancelar", className: "btn btn-secondary" },
      {
        label: "Salvar",
        className: "btn btn-primary",
        closeOnClick: false,
        onClick: async () => {
          const currentPassword = qs("#current-password", form).value;
          const newPassword = qs("#new-password", form).value;
          const confirmPassword = qs("#confirm-password", form).value;

          if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("Preencha todos os campos.");
            return;
          }
          if (newPassword.length < 6) {
            toast.error("A nova senha deve ter pelo menos 6 caracteres.");
            return;
          }
          if (newPassword !== confirmPassword) {
            toast.error("A confirmação não confere com a nova senha.");
            return;
          }

          const session = getSession();
          if (!session) {
            toast.error("Sessão expirada. Faça login novamente.");
            return;
          }

          try {
            const client = await getSupabaseClient();
            // Revalida a senha atual antes de trocar -- evita que alguém com
            // acesso físico a um dispositivo já logado troque a senha sem
            // confirmar a senha de hoje.
            const { error: checkError } = await client.auth.signInWithPassword({
              email: session.email,
              password: currentPassword,
            });
            if (checkError) {
              toast.error("Senha atual incorreta.");
              return;
            }

            const { error: updateError } = await client.auth.updateUser({ password: newPassword });
            if (updateError) throw new Error(updateError.message);

            toast.success("Senha alterada com sucesso.");
            close();
          } catch (err) {
            toast.error(`Não foi possível alterar a senha: ${err.message}`);
          }
        },
      },
    ],
  });
}
