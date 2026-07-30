import { getSupabaseClient, createIsolatedSupabaseClient } from "../database/supabase-client.js";
import { toCamelCaseObject, toSnakeCaseObject } from "../utils/case-utils.js";

export const USER_ROLES = [
  {
    value: "admin",
    label: "Administrador",
    cityRequired: false,
    description: "Acesso total: todas as cidades, Administração e gestão de usuários.",
  },
  {
    value: "lider_simplifique_regional",
    label: "Líder Simplifique Regional",
    cityRequired: false,
    description: "Lê e edita cidades, congregações, jovens e eventos de todas as cidades.",
  },
  {
    value: "conselheiro_regional",
    label: "Conselheiro Regional",
    cityRequired: false,
    description: "Mesmo acesso do Líder Simplifique Regional.",
  },
  {
    value: "lider_simplifique",
    label: "Líder Simplifique",
    cityRequired: true,
    description: "Lê e edita tudo (incluindo excluir) dentro da própria cidade. Também vê eventos de todas as cidades, mas só cria/edita/exclui eventos da própria cidade.",
  },
  {
    value: "conselheiro",
    label: "Conselheiro",
    cityRequired: true,
    description: "Mesmo acesso do Líder Simplifique.",
  },
  {
    value: "convidado_regional",
    label: "Convidado Regional",
    cityRequired: false,
    description: "Somente leitura, em todas as cidades.",
  },
  {
    value: "convidado_local",
    label: "Convidado Local",
    cityRequired: true,
    description: "Somente leitura, apenas da própria cidade.",
  },
];

export function findRole(value) {
  return USER_ROLES.find((r) => r.value === value);
}

export function roleRequiresCity(value) {
  return findRole(value)?.cityRequired ?? false;
}

export const UserManagementService = {
  async listUsers() {
    const client = await getSupabaseClient();
    const { data, error } = await client.from("user_profiles").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(toCamelCaseObject);
  },

  /**
   * Creates a new Supabase Auth user and links a role/city to it. Uses an
   * isolated client for the signUp() call so the admin's own active session
   * is never replaced by the new user's session (a side effect of signUp()
   * on a client that persists sessions).
   */
  async createUser({ email, password, role, cidadeId }) {
    const trimmedEmail = email.trim();
    const isolatedClient = await createIsolatedSupabaseClient();
    const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({
      email: trimmedEmail,
      password,
    });
    if (signUpError) throw new Error(signUpError.message);

    const newUserId = signUpData.user?.id;
    if (!newUserId) throw new Error("Não foi possível obter o ID do novo usuário criado.");

    const record = {
      userId: newUserId,
      email: trimmedEmail,
      role,
      cidadeId: roleRequiresCity(role) ? cidadeId || null : null,
    };

    const adminClient = await getSupabaseClient();
    const { error: insertError } = await adminClient.from("user_profiles").insert(toSnakeCaseObject(record));
    if (insertError) throw new Error(insertError.message);

    return record;
  },

  async updateUserProfile(userId, { role, cidadeId }) {
    const client = await getSupabaseClient();
    const record = { role, cidadeId: roleRequiresCity(role) ? cidadeId || null : null };
    const { error } = await client.from("user_profiles").update(toSnakeCaseObject(record)).eq("user_id", userId);
    if (error) throw new Error(error.message);
  },

  /**
   * Removes the role/city assignment only -- this revokes all data access
   * immediately (RLS finds no matching profile), but does NOT delete the
   * underlying Supabase Auth account, which requires the service_role key
   * and can only be done from the Supabase dashboard (Authentication →
   * Users), never from this client-side app.
   */
  async removeUserProfile(userId) {
    const client = await getSupabaseClient();
    const { error } = await client.from("user_profiles").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
  },
};
