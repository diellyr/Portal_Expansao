import { CityRepository } from "../repositories/city-repository.js";
import { CongregationRepository } from "../repositories/congregation-repository.js";
import { YouthRepository } from "../repositories/youth-repository.js";
import { EventRepository } from "../repositories/event-repository.js";
import { ImportHistoryRepository } from "../repositories/import-history-repository.js";
import { SettingsRepository } from "../repositories/settings-repository.js";
import { clearAllStores as clearAllIndexedDbStores, clearStore as clearIndexedDbStore, STORES } from "../database/db.js";
import * as supabaseDb from "../database/supabase-db.js";
import { isSupabaseMode } from "./data-mode-service.js";
import { generateDemoData } from "../database/seed.js";
import { toCSV } from "../parsers/csv-parser.js";
import { downloadJSON, downloadCSV } from "../utils/file-utils.js";
import { formatBoolean } from "../utils/formatters.js";
import { YOUTH_STATUS_LABELS, SEXO_LABELS } from "../config/constants.js";

export const BACKUP_VERSION = 1;

async function clearStore(table) {
  return isSupabaseMode() ? supabaseDb.clearStore(table) : clearIndexedDbStore(table);
}

async function clearAllStores() {
  return isSupabaseMode() ? supabaseDb.clearAllStores() : clearAllIndexedDbStores();
}

export const BackupService = {
  async exportBackup() {
    const [cities, congregations, youth, events, importHistory, settings] = await Promise.all([
      CityRepository.list(),
      CongregationRepository.list(),
      YouthRepository.list(),
      EventRepository.list(),
      ImportHistoryRepository.list(),
      SettingsRepository.get(),
    ]);
    const backup = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      counts: { cities: cities.length, congregations: congregations.length, youth: youth.length, events: events.length },
      data: { cities, congregations, youth, events, importHistory, settings },
    };
    const filename = `portal-expansao-backup-${new Date().toISOString().slice(0, 10)}.json`;
    downloadJSON(backup, filename);
    return backup;
  },

  parseBackupFile(text) {
    const backup = JSON.parse(text);
    if (!backup || !backup.data || !Array.isArray(backup.data.cities)) {
      throw new Error("Arquivo de backup inválido.");
    }
    return backup;
  },

  async restoreBackup(backup) {
    await clearAllStores();
    const { cities, congregations, youth, events, importHistory, settings } = backup.data;
    for (const c of cities || []) await CityRepository.save(c);
    for (const c of congregations || []) await CongregationRepository.save(c);
    for (const y of youth || []) await YouthRepository.save(y);
    for (const e of events || []) await EventRepository.save(e);
    for (const h of importHistory || []) await ImportHistoryRepository.save(h);
    if (settings) await SettingsRepository.save(settings);
  },

  async loadDemoData() {
    const { cities, congregations, youth, events } = generateDemoData();
    for (const c of cities) await CityRepository.save(c);
    for (const c of congregations) await CongregationRepository.save(c);
    for (const y of youth) await YouthRepository.save(y);
    for (const e of events) await EventRepository.save(e);
    return { cities: cities.length, congregations: congregations.length, youth: youth.length, events: events.length };
  },

  async removeDemoData() {
    const [cities, congregations, youth, events] = await Promise.all([
      CityRepository.list(),
      CongregationRepository.list(),
      YouthRepository.list(),
      EventRepository.list(),
    ]);
    let removed = 0;
    for (const c of youth.filter((r) => r.isDemo)) { await YouthRepository.remove(c.id); removed++; }
    for (const c of events.filter((r) => r.isDemo)) { await EventRepository.remove(c.id); removed++; }
    for (const c of congregations.filter((r) => r.isDemo)) { await CongregationRepository.remove(c.id); removed++; }
    for (const c of cities.filter((r) => r.isDemo)) { await CityRepository.remove(c.id); removed++; }
    return removed;
  },

  async exportYouthCSV(youthList, cities, congregations) {
    const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.nome]));
    const congMap = Object.fromEntries(congregations.map((c) => [c.id, c.nome]));
    const headers = [
      "codigo", "nome", "data_nascimento", "naturalidade", "sexo", "telefone", "celular",
      "endereco", "numero", "bairro", "cep", "cidade", "congregacao", "status",
      "rg", "orgao_emissor", "cpf", "escolaridade", "profissao", "cargo",
      "estado_civil", "outro_estado_civil", "conjuge",
      "pastor", "conselheiro_local", "conselheiro_cidade", "data_batismo_aguas",
      "batizado_espirito_santo", "instrumento", "prega", "canta", "outros_talentos",
      "qtd", "lider_expansao", "se_lider", "qual_departamento",
      "nome_dirigente", "recebido_por", "tipo_admissao", "observacoes",
    ];
    const rows = youthList.map((y) => ({
      codigo: y.codigo || "",
      nome: y.nome,
      data_nascimento: y.dataNascimento || "",
      naturalidade: y.naturalidade || "",
      sexo: SEXO_LABELS[y.sexo] || "",
      telefone: y.telefone || "",
      celular: y.celular || "",
      endereco: y.endereco || "",
      numero: y.numero || "",
      bairro: y.bairro || "",
      cep: y.cep || "",
      cidade: cityMap[y.cidadeId] || "",
      congregacao: congMap[y.congregacaoId] || "",
      status: YOUTH_STATUS_LABELS[y.status] || y.status,
      rg: y.rg || "",
      orgao_emissor: y.orgaoEmissor || "",
      cpf: y.cpf || "",
      escolaridade: y.escolaridade || "",
      profissao: y.profissao || "",
      cargo: y.cargo || "",
      estado_civil: y.estadoCivil || "",
      outro_estado_civil: y.outroEstadoCivil || "",
      conjuge: y.conjuge || "",
      pastor: y.pastor || "",
      conselheiro_local: y.conselheiroLocal || "",
      conselheiro_cidade: y.conselheiroCidade || "",
      data_batismo_aguas: y.dataBatismoAguas || "",
      batizado_espirito_santo: formatBoolean(y.batizadoEspiritoSanto),
      instrumento: y.instrumento || "",
      prega: formatBoolean(y.prega),
      canta: formatBoolean(y.canta),
      outros_talentos: y.outrosTalentos || "",
      qtd: y.qtd || "",
      lider_expansao: formatBoolean(y.liderExpansao),
      se_lider: y.seLider || "",
      qual_departamento: y.qualDepartamento || "",
      nome_dirigente: y.nomeDirigente || "",
      recebido_por: y.recebidoPor || "",
      tipo_admissao: y.tipoAdmissao || "",
      observacoes: y.observacoes || "",
    }));
    downloadCSV(toCSV(rows, headers), `portal-expansao-jovens-${new Date().toISOString().slice(0, 10)}.csv`);
  },

  async exportYouthExcel(youthList, cities, congregations) {
    if (!window.XLSX) throw new Error("Biblioteca SheetJS não carregada.");
    const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.nome]));
    const congMap = Object.fromEntries(congregations.map((c) => [c.id, c.nome]));
    const rows = youthList.map((y) => ({
      Código: y.codigo || "",
      Nome: y.nome,
      "Data de Nascimento": y.dataNascimento || "",
      Naturalidade: y.naturalidade || "",
      Sexo: SEXO_LABELS[y.sexo] || "",
      Telefone: y.telefone || "",
      Celular: y.celular || "",
      Endereço: y.endereco || "",
      Número: y.numero || "",
      Bairro: y.bairro || "",
      CEP: y.cep || "",
      Cidade: cityMap[y.cidadeId] || "",
      Congregação: congMap[y.congregacaoId] || "",
      Status: YOUTH_STATUS_LABELS[y.status] || y.status,
      RG: y.rg || "",
      "Órgão Emissor": y.orgaoEmissor || "",
      CPF: y.cpf || "",
      Escolaridade: y.escolaridade || "",
      Profissão: y.profissao || "",
      Cargo: y.cargo || "",
      "Estado Civil": y.estadoCivil || "",
      "Outro (qual)?": y.outroEstadoCivil || "",
      Cônjuge: y.conjuge || "",
      Pastor: y.pastor || "",
      "Conselheiro Local": y.conselheiroLocal || "",
      "Conselheiro da Cidade": y.conselheiroCidade || "",
      "Batismo nas Águas": y.dataBatismoAguas || "",
      "Batizado no Espírito Santo": formatBoolean(y.batizadoEspiritoSanto),
      Instrumento: y.instrumento || "",
      Prega: formatBoolean(y.prega),
      Canta: formatBoolean(y.canta),
      "Outros Talentos": y.outrosTalentos || "",
      Qtd: y.qtd || "",
      "Líder de Expansão?": formatBoolean(y.liderExpansao),
      "Se líder, qual?": y.seLider || "",
      "Qual Departamento?": y.qualDepartamento || "",
      "Nome do Dirigente": y.nomeDirigente || "",
      "Cadastro Recebido Por": y.recebidoPor || "",
      "Tipo de Admissão": y.tipoAdmissao || "",
      Observações: y.observacoes || "",
    }));
    const worksheet = window.XLSX.utils.json_to_sheet(rows);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Jovens");
    window.XLSX.writeFile(workbook, `portal-expansao-jovens-${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  async deleteYouthOnly() { await clearStore(STORES.YOUTH); },
  async deleteEventsOnly() { await clearStore(STORES.EVENTS); },
  async deleteImportHistory() { await clearStore(STORES.IMPORT_HISTORY); },

  async deleteCityData(cityId) {
    const [congregations, youth, events] = await Promise.all([
      CongregationRepository.list(),
      YouthRepository.list(),
      EventRepository.list(),
    ]);
    for (const y of youth.filter((r) => r.cidadeId === cityId)) await YouthRepository.remove(y.id);
    for (const e of events.filter((r) => r.cidadeId === cityId)) await EventRepository.remove(e.id);
    for (const c of congregations.filter((r) => r.cidadeId === cityId)) await CongregationRepository.remove(c.id);
    await CityRepository.remove(cityId);
  },

  async deleteAllData() { await clearAllStores(); },
};
