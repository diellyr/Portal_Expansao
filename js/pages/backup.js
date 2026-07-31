import { bootstrapPage } from "../app.js";
import { getCurrentUserProfile } from "../services/user-profile-service.js";
import { isSupabaseConfigured } from "../services/supabase-settings-service.js";
import { BackupService } from "../services/backup-service.js";
import { CityService } from "../services/city-service.js";
import { toast } from "../components/toast.js";
import { qs } from "../utils/dom-utils.js";

const ALLOWED_ROLES = ["admin", "lider_simplifique_regional", "conselheiro_regional", "lider_simplifique", "conselheiro"];
const CITY_SCOPED_ROLES = ["lider_simplifique", "conselheiro"];

const ok = await bootstrapPage({ activeKey: "backup", title: "Backup" });
if (ok) init();

async function init() {
  const profile = await getCurrentUserProfile();
  if (!ALLOWED_ROLES.includes(profile?.role)) {
    window.location.href = "dashboard.html";
    return;
  }

  if (CITY_SCOPED_ROLES.includes(profile.role) && profile.cidadeId) {
    const city = await CityService.getById(profile.cidadeId);
    qs("#backup-scope-desc").textContent = `O backup total inclui apenas os dados da sua cidade: ${city?.nome || "cidade não encontrada"}.`;
  } else {
    qs("#backup-scope-desc").textContent = "O backup total inclui os dados de todas as cidades.";
  }

  if (!isSupabaseConfigured()) {
    qs("#backup-not-configured-notice").hidden = false;
    qs("#backup-total-btn").disabled = true;
    return;
  }

  qs("#backup-total-btn").addEventListener("click", async () => {
    try {
      await BackupService.exportBackupTotal(profile);
      toast.success("Backup total criado com sucesso.");
    } catch (err) {
      toast.error(`Não foi possível gerar o backup: ${err.message}`);
    }
  });
}
