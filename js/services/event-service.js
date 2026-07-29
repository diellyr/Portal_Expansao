import { EventRepository } from "../repositories/event-repository.js";
import { validateEvent, hasErrors } from "../utils/validators.js";
import { todayISO } from "../utils/dates.js";

export const EventService = {
  async list() {
    const events = await EventRepository.list();
    return events.sort((a, b) => a.data.localeCompare(b.data));
  },

  async getById(id) {
    return EventRepository.getById(id);
  },

  async upcoming(limit = 5) {
    const events = await this.list();
    const today = todayISO();
    return events.filter((e) => e.data >= today).slice(0, limit);
  },

  async splitFutureAndPast() {
    const events = await this.list();
    const today = todayISO();
    return {
      futuros: events.filter((e) => e.data >= today),
      passados: events.filter((e) => e.data < today).reverse(),
    };
  },

  validate(data) {
    return validateEvent(data);
  },

  async save(data) {
    const errors = validateEvent(data);
    if (hasErrors(errors)) throw Object.assign(new Error("Dados inválidos"), { errors });

    const now = new Date().toISOString();
    const record = {
      id: data.id || crypto.randomUUID(),
      titulo: data.titulo.trim(),
      tipo: data.tipo,
      data: data.data,
      horario: data.horario || "",
      cidadeId: data.cidadeId,
      congregacaoId: data.congregacaoId || null,
      regional: data.regional === true,
      local: data.local?.trim() || "",
      descricao: data.descricao?.trim() || "",
      isDemo: data.isDemo || false,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
    return EventRepository.save(record);
  },

  async remove(id) {
    return EventRepository.remove(id);
  },
};
