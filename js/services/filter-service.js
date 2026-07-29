import { calculateAge, getAgeRangeKey } from "../utils/dates.js";

export function defaultFilters() {
  return {
    cidadeId: "all",
    congregacaoId: "all",
    status: "all",
    faixaEtaria: "all",
    batizadoAguas: "all",
    batizadoEspiritoSanto: "all",
    prega: "all",
    canta: "all",
    instrumento: "all",
    dataInicio: "",
    dataFim: "",
  };
}

function matchesTriState(fieldValue, filterValue) {
  if (filterValue === "all") return true;
  if (filterValue === "sim") return fieldValue === true;
  if (filterValue === "nao") return fieldValue === false;
  if (filterValue === "nao_informado") return fieldValue === null || fieldValue === undefined;
  return true;
}

export function applyYouthFilters(youthList, filters) {
  return youthList.filter((youth) => {
    if (filters.cidadeId !== "all" && youth.cidadeId !== filters.cidadeId) return false;
    if (filters.congregacaoId !== "all" && youth.congregacaoId !== filters.congregacaoId) return false;
    if (filters.status !== "all" && youth.status !== filters.status) return false;

    if (filters.faixaEtaria !== "all") {
      const age = calculateAge(youth.dataNascimento);
      if (getAgeRangeKey(age) !== filters.faixaEtaria) return false;
    }

    if (filters.batizadoAguas !== "all") {
      const has = !!youth.dataBatismoAguas;
      if (filters.batizadoAguas === "sim" && !has) return false;
      if (filters.batizadoAguas === "nao" && has) return false;
    }

    if (!matchesTriState(youth.batizadoEspiritoSanto, filters.batizadoEspiritoSanto)) return false;
    if (!matchesTriState(youth.prega, filters.prega)) return false;
    if (!matchesTriState(youth.canta, filters.canta)) return false;

    if (filters.instrumento !== "all") {
      if (filters.instrumento === "nenhum") {
        if (youth.instrumento) return false;
      } else if (youth.instrumento !== filters.instrumento) {
        return false;
      }
    }

    if (filters.dataInicio && (!youth.dataEntrada || youth.dataEntrada < filters.dataInicio)) return false;
    if (filters.dataFim && (!youth.dataEntrada || youth.dataEntrada > filters.dataFim)) return false;

    return true;
  });
}

export function availableCongregations(allCongregations, cidadeId) {
  if (cidadeId === "all") return allCongregations;
  return allCongregations.filter((c) => c.cidadeId === cidadeId);
}

export function activeFilterChips(filters, lookups) {
  const chips = [];
  if (filters.cidadeId !== "all") {
    chips.push({ key: "cidadeId", label: `Cidade: ${lookups.cityName(filters.cidadeId)}` });
  }
  if (filters.congregacaoId !== "all") {
    chips.push({ key: "congregacaoId", label: `Congregação: ${lookups.congregationName(filters.congregacaoId)}` });
  }
  if (filters.status !== "all") {
    chips.push({ key: "status", label: `Status: ${lookups.statusLabel(filters.status)}` });
  }
  if (filters.faixaEtaria !== "all") {
    chips.push({ key: "faixaEtaria", label: `Faixa etária: ${lookups.ageRangeLabel(filters.faixaEtaria)}` });
  }
  if (filters.batizadoAguas !== "all") {
    chips.push({ key: "batizadoAguas", label: `Batismo nas águas: ${filters.batizadoAguas === "sim" ? "Sim" : "Não"}` });
  }
  if (filters.batizadoEspiritoSanto !== "all") {
    chips.push({ key: "batizadoEspiritoSanto", label: `Batismo Espírito Santo: ${filters.batizadoEspiritoSanto === "sim" ? "Sim" : "Não"}` });
  }
  if (filters.prega !== "all") {
    chips.push({ key: "prega", label: `Prega: ${filters.prega === "sim" ? "Sim" : "Não"}` });
  }
  if (filters.canta !== "all") {
    chips.push({ key: "canta", label: `Canta: ${filters.canta === "sim" ? "Sim" : "Não"}` });
  }
  if (filters.instrumento !== "all") {
    chips.push({ key: "instrumento", label: `Instrumento: ${filters.instrumento === "nenhum" ? "Nenhum" : filters.instrumento}` });
  }
  if (filters.dataInicio) chips.push({ key: "dataInicio", label: `A partir de: ${filters.dataInicio}` });
  if (filters.dataFim) chips.push({ key: "dataFim", label: `Até: ${filters.dataFim}` });
  return chips;
}
