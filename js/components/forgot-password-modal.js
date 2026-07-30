import { el, qs } from "../utils/dom-utils.js";
import { openModal } from "./modal.js";
import { toast } from "./toast.js";
import { getSupabaseClient } from "../database/supabase-client.js";

export function openForgotPasswordModal() {
  const form = el("form", { novalidate: true }, [
    el("div", { class: "form-group" }, [
      el("label", { for: "forgot-email", class: "required" }, "E-mail"),
      el("input", { type: "email", id: "forgot-email", class: "form-control", autocomplete: "email" }),
    ]),
    el(
      "p",
      { class: "text-muted", style: "margin-top: var(--space-2);" },
      "Enviaremos um link de redefinição de senha para o e-mail informado, caso ele já tenha uma conta cadastrada."
    ),
  ]);

  const { close } = openModal({
    title: "Esqueci minha senha",
    body: form,
    actions: [
      { label: "Cancelar", className: "btn btn-secondary" },
      {
        label: "Enviar link",
        className: "btn btn-primary",
        closeOnClick: false,
        onClick: async () => {
          const email = qs("#forgot-email", form).value.trim();
          if (!email) {
            toast.error("Informe o e-mail.");
            return;
          }

          try {
            const client = await getSupabaseClient();
            const redirectTo = new URL("redefinir-senha.html", window.location.href).href;
            const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) throw new Error(error.message);
            toast.success("Se esse e-mail estiver cadastrado, você vai receber um link para redefinir a senha.");
            close();
          } catch (err) {
            toast.error(`Não foi possível enviar o link: ${err.message}`);
          }
        },
      },
    ],
  });
}
