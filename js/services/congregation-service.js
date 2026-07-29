import { CongregationRepository } from "../repositories/congregation-repository.js";
import { YouthRepository } from "../repositories/youth-repository.js";
import { validateCongregation, hasErrors } from "../utils/validators.js";

export const CongregationService = {
  async list() {
    const congregations = await CongregationRepository.list();
    return congregations.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  },

  async getById(id) {
    return CongregationRepository.getById(id);
  },

  async listByCity(cityId) {
    const all = await this.list();
    return cityId ? all.filter((c) => c.cidadeId === cityId) : all;
  },

  async listWithCounts() {
    const [congregations, youth] = await Promise.all([this.list(), YouthRepository.list()]);
    return congregations.map((c) => ({
      ...c,
      totalJovens: youth.filter((y) => y.congregacaoId === c.id).length,
    }));
  },

  async getIndicators(congregationId) {
    const youth = (await YouthRepository.list()).filter((y) => y.congregacaoId === congregationId);
    return {
      totalJovens: youth.length,
      ativos: youth.filter((y) => y.status === "ativo").length,
      visitantes: youth.filter((y) => y.status === "visitante").length,
      batizadosAguas: youth.filter((y) => !!y.dataBatismoAguas).length,
      batizadosEspiritoSanto: youth.filter((y) => y.batizadoEspiritoSanto === true).length,
      cantam: youth.filter((y) => y.canta === true).length,
      pregam: youth.filter((y) => y.prega === true).length,
    };
  },

  validate(data) {
    return validateCongregation(data);
  },

  async save(data) {
    const errors = validateCongregation(data);
    if (hasErrors(errors)) throw Object.assign(new Error("Dados inválidos"), { errors });

    const now = new Date().toISOString();
    const record = {
      id: data.id || crypto.randomUUID(),
      cidadeId: data.cidadeId,
      nome: data.nome.trim(),
      bairro: data.bairro?.trim() || "",
      endereco: data.endereco?.trim() || "",
      pastor: data.pastor?.trim() || "",
      conselheiroLocal: data.conselheiroLocal?.trim() || "",
      telefoneConselheiro: data.telefoneConselheiro?.trim() || "",
      ativo: data.ativo !== false,
      isDemo: data.isDemo || false,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
    return CongregationRepository.save(record);
  },

  async remove(id) {
    return CongregationRepository.remove(id);
  },
};
