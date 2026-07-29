import { CityRepository } from "../repositories/city-repository.js";
import { CongregationRepository } from "../repositories/congregation-repository.js";
import { YouthRepository } from "../repositories/youth-repository.js";
import { validateCity, hasErrors } from "../utils/validators.js";

export const CityService = {
  async list() {
    const cities = await CityRepository.list();
    return cities.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  },

  async getById(id) {
    return CityRepository.getById(id);
  },

  async listWithCounts() {
    const [cities, congregations, youth] = await Promise.all([
      this.list(),
      CongregationRepository.list(),
      YouthRepository.list(),
    ]);
    return cities.map((city) => ({
      ...city,
      totalCongregacoes: congregations.filter((c) => c.cidadeId === city.id).length,
      totalJovens: youth.filter((y) => y.cidadeId === city.id).length,
    }));
  },

  async getIndicators(cityId) {
    const [congregations, youth] = await Promise.all([
      CongregationRepository.list(),
      YouthRepository.list(),
    ]);
    const cityYouth = youth.filter((y) => y.cidadeId === cityId);
    return {
      totalJovens: cityYouth.length,
      ativos: cityYouth.filter((y) => y.status === "ativo").length,
      visitantes: cityYouth.filter((y) => y.status === "visitante").length,
      congregacoes: congregations.filter((c) => c.cidadeId === cityId).length,
      batizadosAguas: cityYouth.filter((y) => !!y.dataBatismoAguas).length,
      batizadosEspiritoSanto: cityYouth.filter((y) => y.batizadoEspiritoSanto === true).length,
      cantam: cityYouth.filter((y) => y.canta === true).length,
      pregam: cityYouth.filter((y) => y.prega === true).length,
      instrumentos: cityYouth.filter((y) => !!y.instrumento).map((y) => y.instrumento),
    };
  },

  validate(data) {
    return validateCity(data);
  },

  async save(data) {
    const errors = validateCity(data);
    if (hasErrors(errors)) throw Object.assign(new Error("Dados inválidos"), { errors });

    const now = new Date().toISOString();
    const record = {
      id: data.id || crypto.randomUUID(),
      nome: data.nome.trim(),
      estado: data.estado?.trim() || "",
      liderCidade: data.liderCidade?.trim() || "",
      conselheiroCidade: data.conselheiroCidade?.trim() || "",
      telefoneLider: data.telefoneLider?.trim() || "",
      pastorResponsavel: data.pastorResponsavel?.trim() || "",
      ativo: data.ativo !== false,
      isDemo: data.isDemo || false,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
    return CityRepository.save(record);
  },

  async remove(id) {
    return CityRepository.remove(id);
  },
};
