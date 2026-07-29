import { normalizeDate } from "./dates.js";

export function isRequired(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function isValidDateString(value) {
  if (!value) return true;
  return normalizeDate(value) !== null;
}

export function validateCity(data) {
  const errors = {};
  if (!isRequired(data.nome)) errors.nome = "Nome da cidade é obrigatório.";
  return errors;
}

export function validateCongregation(data) {
  const errors = {};
  if (!isRequired(data.nome)) errors.nome = "Nome da congregação é obrigatório.";
  if (!isRequired(data.cidadeId)) errors.cidadeId = "Cidade é obrigatória.";
  return errors;
}

export function validateYouth(data) {
  const errors = {};
  if (!isRequired(data.nome)) errors.nome = "Nome é obrigatório.";
  if (!isRequired(data.cidadeId)) errors.cidadeId = "Cidade é obrigatória.";
  if (data.dataNascimento && !isValidDateString(data.dataNascimento)) {
    errors.dataNascimento = "Data de nascimento inválida.";
  }
  return errors;
}

export function validateEvent(data) {
  const errors = {};
  if (!isRequired(data.titulo)) errors.titulo = "Título é obrigatório.";
  if (!isRequired(data.tipo)) errors.tipo = "Tipo é obrigatório.";
  if (!isRequired(data.data)) errors.data = "Data é obrigatória.";
  else if (!isValidDateString(data.data)) errors.data = "Data inválida.";
  if (!isRequired(data.cidadeId)) errors.cidadeId = "Cidade é obrigatória.";
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
