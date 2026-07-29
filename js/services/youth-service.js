import { YouthRepository } from "../repositories/youth-repository.js";
import { validateYouth, hasErrors } from "../utils/validators.js";
import { calculateAge } from "../utils/dates.js";

export const YouthService = {
  async list() {
    return YouthRepository.list();
  },

  async listWithAge() {
    const youth = await this.list();
    return youth.map((y) => ({ ...y, idade: calculateAge(y.dataNascimento) }));
  },

  async getById(id) {
    return YouthRepository.getById(id);
  },

  validate(data) {
    return validateYouth(data);
  },

  async save(data) {
    const errors = validateYouth(data);
    if (hasErrors(errors)) throw Object.assign(new Error("Dados inválidos"), { errors });

    const now = new Date().toISOString();
    const record = {
      id: data.id || crypto.randomUUID(),
      nome: data.nome.trim(),
      dataNascimento: data.dataNascimento || null,
      telefone: data.telefone?.trim() || "",
      bairro: data.bairro?.trim() || "",
      cidadeId: data.cidadeId,
      congregacaoId: data.congregacaoId,
      status: data.status || "ativo",
      nomePai: data.nomePai?.trim() || "",
      nomeMae: data.nomeMae?.trim() || "",
      pastor: data.pastor?.trim() || "",
      conselheiroLocal: data.conselheiroLocal?.trim() || "",
      conselheiroCidade: data.conselheiroCidade?.trim() || "",
      dataBatismoAguas: data.dataBatismoAguas || null,
      batizadoEspiritoSanto: data.batizadoEspiritoSanto === true,
      instrumento: data.instrumento?.trim() || "",
      prega: data.prega === true,
      canta: data.canta === true,
      outrosTalentos: data.outrosTalentos?.trim() || "",
      observacoes: data.observacoes?.trim() || "",
      dataEntrada: data.dataEntrada || now.slice(0, 10),
      ativo: data.status !== "inativo",
      isDemo: data.isDemo || false,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
    return YouthRepository.save(record);
  },

  async remove(id) {
    return YouthRepository.remove(id);
  },

  isIncomplete(youth) {
    const missing = [];
    if (!youth.dataNascimento) missing.push("Data de nascimento");
    if (!youth.cidadeId) missing.push("Cidade");
    if (!youth.congregacaoId) missing.push("Congregação");
    if (!youth.telefone) missing.push("Telefone");
    if (!youth.pastor) missing.push("Pastor");
    if (!youth.conselheiroLocal) missing.push("Conselheiro");
    if (youth.dataBatismoAguas === undefined) missing.push("Batismo nas águas");
    return missing;
  },
};
