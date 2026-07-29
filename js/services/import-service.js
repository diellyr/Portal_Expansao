import { normalizeText, normalizeForComparison, normalizeHeader, normalizeBoolean, validateMappedRow } from "./validation-service.js";
import { normalizeDate } from "../utils/dates.js";
import { CityService } from "./city-service.js";
import { CongregationService } from "./congregation-service.js";
import { YouthRepository } from "../repositories/youth-repository.js";
import { ImportHistoryRepository } from "../repositories/import-history-repository.js";
import { YOUTH_STATUS } from "../config/constants.js";

export const EXPECTED_FIELDS = [
  { key: "codigo", label: "Código" },
  { key: "nome", label: "Nome", required: true },
  { key: "data_nascimento", label: "Data de nascimento" },
  { key: "naturalidade", label: "Naturalidade" },
  { key: "telefone", label: "Telefone" },
  { key: "celular", label: "Celular" },
  { key: "endereco", label: "Endereço" },
  { key: "numero", label: "Número" },
  { key: "bairro", label: "Bairro" },
  { key: "cep", label: "CEP" },
  { key: "cidade", label: "Cidade", required: true },
  { key: "congregacao", label: "Congregação", required: true },
  { key: "status", label: "Status" },
  { key: "rg", label: "RG" },
  { key: "orgao_emissor", label: "Órgão emissor" },
  { key: "cpf", label: "CPF" },
  { key: "escolaridade", label: "Escolaridade" },
  { key: "profissao", label: "Profissão" },
  { key: "cargo", label: "Cargo" },
  { key: "estado_civil", label: "Estado civil" },
  { key: "outro_estado_civil", label: "Outro (qual)?" },
  { key: "conjuge", label: "Cônjuge" },
  { key: "conselheiro_local", label: "Conselheiro local" },
  { key: "conselheiro_cidade", label: "Conselheiro da cidade" },
  { key: "pastor", label: "Pastor" },
  { key: "pai", label: "Nome do pai" },
  { key: "mae", label: "Nome da mãe" },
  { key: "data_batismo_aguas", label: "Data de batismo nas águas" },
  { key: "batizado_espirito_santo", label: "Batizado no Espírito Santo" },
  { key: "instrumento", label: "Instrumento" },
  { key: "prega", label: "Prega" },
  { key: "canta", label: "Canta" },
  { key: "outros_talentos", label: "Outros talentos" },
  { key: "qtd", label: "Qtd" },
  { key: "lider_expansao", label: "Líder de Expansão?" },
  { key: "se_lider", label: "Se líder, qual?" },
  { key: "qual_departamento", label: "Qual departamento?" },
  { key: "nome_dirigente", label: "Nome do dirigente" },
  { key: "recebido_por", label: "Cadastro recebido por" },
  { key: "tipo_admissao", label: "Tipo de admissão" },
  { key: "observacoes", label: "Observações" },
];

// Alias lists are matched with normalizeHeader(), which lowercases, strips
// accents/punctuation, and treats underscores as spaces — so "QTD.",
// "Estado_Civil?" and "estado civil" all reduce to the same key ("qtd",
// "estado civil") and only need to be listed once, in their plain form.
const COLUMN_ALIASES = {
  codigo: ["codigo", "cod"],
  nome: ["nome", "nome completo", "nome do jovem", "jovem"],
  data_nascimento: ["data nascimento", "nascimento", "data de nascimento"],
  naturalidade: ["naturalidade"],
  telefone: ["telefone", "contato"],
  celular: ["celular", "whatsapp", "numero celular"],
  endereco: ["endereco", "rua", "logradouro"],
  numero: ["numero", "nº"],
  bairro: ["bairro"],
  cep: ["cep"],
  cidade: ["cidade", "cidade da congregacao"],
  congregacao: ["congregacao", "congregacao local"],
  status: ["status", "situacao"],
  rg: ["rg"],
  orgao_emissor: ["orgao emissor", "org emissor"],
  cpf: ["cpf"],
  escolaridade: ["escolaridade"],
  profissao: ["profissao"],
  cargo: ["cargo", "funcao"],
  estado_civil: ["estado civil"],
  outro_estado_civil: ["outro qual", "outro estado civil"],
  conjuge: ["conjuge", "nome do conjuge"],
  conselheiro_local: ["conselheiro local"],
  conselheiro_cidade: ["conselheiro cidade", "conselheiro da cidade"],
  pastor: ["pastor"],
  pai: ["pai", "nome do pai"],
  mae: ["mae", "nome da mae"],
  data_batismo_aguas: ["data batismo aguas", "batismo aguas", "data batismo", "data do batismo"],
  batizado_espirito_santo: ["batizado espirito santo", "batizado es", "espirito santo"],
  instrumento: ["instrumento"],
  prega: ["prega"],
  canta: ["canta"],
  outros_talentos: ["outros talentos"],
  qtd: ["qtd", "quantidade"],
  lider_expansao: ["lider expansao", "e lider de expansao", "lider de expansao"],
  se_lider: ["se lider", "se lider qual"],
  qual_departamento: ["qual departamento", "departamento", "se lider qual departamento"],
  nome_dirigente: ["nome dirigente", "dirigente"],
  recebido_por: ["cadastro recebido por", "recebido por"],
  tipo_admissao: ["tipo admissao", "admissao"],
  observacoes: ["observacoes"],
};

export function suggestMapping(headers) {
  const mapping = {};
  for (const field of EXPECTED_FIELDS) {
    const aliases = COLUMN_ALIASES[field.key].map(normalizeHeader);
    const match = headers.find((h) => aliases.includes(normalizeHeader(h)));
    mapping[field.key] = match || null;
  }
  return mapping;
}

function statusKeyFrom(rawStatus) {
  const normalized = normalizeForComparison(rawStatus);
  const found = Object.values(YOUTH_STATUS).find((s) => normalizeForComparison(s) === normalized || normalizeForComparison(s.replace("_", " ")) === normalized);
  return found || null;
}

export function mapRecords(records, mapping) {
  return records.map((raw) => {
    const get = (key) => (mapping[key] ? raw[mapping[key]] : "");
    const statusRaw = normalizeText(get("status"));
    const statusValido = statusRaw ? !!statusKeyFrom(statusRaw) : true;

    return {
      raw,
      codigo: normalizeText(get("codigo")),
      nome: normalizeText(get("nome")),
      naturalidade: normalizeText(get("naturalidade")),
      bairro: normalizeText(get("bairro")),
      endereco: normalizeText(get("endereco")),
      numero: normalizeText(get("numero")),
      cep: normalizeText(get("cep")),
      cidade: normalizeText(get("cidade")),
      congregacao: normalizeText(get("congregacao")),
      data_nascimento_raw: get("data_nascimento"),
      data_nascimento: normalizeDate(get("data_nascimento")),
      telefone: normalizeText(get("telefone")),
      celular: normalizeText(get("celular")),
      status_raw: statusRaw,
      status: statusRaw && statusValido ? statusKeyFrom(statusRaw) : "ativo",
      statusValido,
      rg: normalizeText(get("rg")),
      orgao_emissor: normalizeText(get("orgao_emissor")),
      cpf: normalizeText(get("cpf")),
      escolaridade: normalizeText(get("escolaridade")),
      profissao: normalizeText(get("profissao")),
      cargo: normalizeText(get("cargo")),
      outro_estado_civil: normalizeText(get("outro_estado_civil")),
      conjuge: normalizeText(get("conjuge")),
      conselheiro_local: normalizeText(get("conselheiro_local")),
      conselheiro_cidade: normalizeText(get("conselheiro_cidade")),
      pastor: normalizeText(get("pastor")),
      pai: normalizeText(get("pai")),
      mae: normalizeText(get("mae")),
      data_batismo_aguas: normalizeDate(get("data_batismo_aguas")),
      batizado_espirito_santo: normalizeBoolean(get("batizado_espirito_santo")),
      instrumento: normalizeText(get("instrumento")),
      prega: normalizeBoolean(get("prega")) === true,
      canta: normalizeBoolean(get("canta")) === true,
      outros_talentos: normalizeText(get("outros_talentos")),
      qtd: normalizeText(get("qtd")),
      estado_civil: normalizeText(get("estado_civil")),
      lider_expansao: normalizeBoolean(get("lider_expansao")) === true,
      se_lider: normalizeText(get("se_lider")),
      qual_departamento: normalizeText(get("qual_departamento")),
      nome_dirigente: normalizeText(get("nome_dirigente")),
      recebido_por: normalizeText(get("recebido_por")),
      tipo_admissao: normalizeText(get("tipo_admissao")),
      observacoes: normalizeText(get("observacoes")),
    };
  });
}

/**
 * Compares the file's headers against EXPECTED_FIELDS/aliases so the mapping
 * step can warn about optional columns the file doesn't have, and list any
 * headers in the file that weren't recognized by any alias (informational —
 * they can still be mapped manually).
 */
export function diffHeaders(headers, mapping) {
  const missingFields = EXPECTED_FIELDS.filter((f) => !f.required && !mapping[f.key]);
  const mappedHeaders = new Set(Object.values(mapping).filter(Boolean));
  const unrecognizedHeaders = headers.filter((h) => !mappedHeaders.has(h));
  return { missingFields, unrecognizedHeaders };
}

function duplicateKey(row) {
  const nome = normalizeForComparison(row.nome);
  if (row.data_nascimento) return `${nome}|${row.data_nascimento}|${normalizeForComparison(row.congregacao)}`;
  return `${nome}|${normalizeForComparison(row.congregacao)}|${normalizeForComparison(row.cidade)}`;
}

export async function analyzeImport(mappedRows) {
  const [existingCities, existingCongregations, existingYouth] = await Promise.all([
    CityService.list(),
    CongregationService.list(),
    YouthRepository.list(),
  ]);

  const cityByName = new Map(existingCities.map((c) => [normalizeForComparison(c.nome), c]));
  const congByKey = new Map(
    existingCongregations.map((c) => [`${normalizeForComparison(c.nome)}|${c.cidadeId}`, c])
  );

  const existingKeys = new Set(
    existingYouth.map((y) => {
      const city = existingCities.find((c) => c.id === y.cidadeId);
      const cong = existingCongregations.find((c) => c.id === y.congregacaoId);
      const nome = normalizeForComparison(y.nome);
      if (y.dataNascimento) return `${nome}|${y.dataNascimento}|${normalizeForComparison(cong?.nome || "")}`;
      return `${nome}|${normalizeForComparison(cong?.nome || "")}|${normalizeForComparison(city?.nome || "")}`;
    })
  );

  const newCityNames = new Set();
  const newCongregations = new Map(); // key: cidadeNome|congNome -> {nome, cidadeNome}
  const seenBatchKeys = new Set();

  const rows = mappedRows.map((row) => {
    const validation = validateMappedRow(row);
    const cityKey = normalizeForComparison(row.cidade);
    const cityMatch = cityByName.get(cityKey) || null;
    const isNewCity = !!row.cidade && !cityMatch;
    if (isNewCity) newCityNames.add(row.cidade);

    const congKey = row.cidade && row.congregacao ? `${normalizeForComparison(row.congregacao)}|${cityMatch?.id || cityKey}` : null;
    const congregationMatch = congKey ? congByKey.get(congKey) || null : null;
    const isNewCongregation = !!row.congregacao && !congregationMatch;
    if (isNewCongregation && row.congregacao && row.cidade) {
      newCongregations.set(`${cityKey}|${normalizeForComparison(row.congregacao)}`, {
        nome: row.congregacao,
        cidadeNome: row.cidade,
      });
    }

    const key = duplicateKey(row);
    const isDuplicate = validation.errors.length === 0 && (existingKeys.has(key) || seenBatchKeys.has(key));
    seenBatchKeys.add(key);

    let rowStatus = validation.status;
    if (isDuplicate && rowStatus !== "invalida") rowStatus = "duplicada";

    return {
      ...row,
      rowStatus,
      errors: validation.errors,
      warnings: validation.warnings,
      isDuplicate,
      isNewCity,
      isNewCongregation,
      cityMatchId: cityMatch?.id || null,
    };
  });

  const summary = {
    total: rows.length,
    validas: rows.filter((r) => r.rowStatus === "valida").length,
    avisos: rows.filter((r) => r.rowStatus === "aviso").length,
    invalidas: rows.filter((r) => r.rowStatus === "invalida").length,
    duplicadas: rows.filter((r) => r.rowStatus === "duplicada").length,
    novasCidades: newCityNames.size,
    novasCongregacoes: newCongregations.size,
  };

  return { rows, newCityNames: [...newCityNames], newCongregations: [...newCongregations.values()], summary };
}

export async function commitImport(rows, { duplicateStrategy = "ignorar", fileName, fileFormat } = {}) {
  const cities = await CityService.list();
  const congregations = await CongregationService.list();
  const cityByName = new Map(cities.map((c) => [normalizeForComparison(c.nome), c]));
  const congByKey = new Map(congregations.map((c) => [`${normalizeForComparison(c.nome)}|${c.cidadeId}`, c]));
  const existingYouth = await YouthRepository.list();

  let criados = 0;
  let atualizados = 0;
  let ignorados = 0;
  let erros = 0;

  for (const row of rows) {
    if (row.rowStatus === "invalida") {
      erros++;
      continue;
    }
    if (row.rowStatus === "duplicada" && duplicateStrategy === "ignorar") {
      ignorados++;
      continue;
    }

    const cityKey = normalizeForComparison(row.cidade);
    let city = cityByName.get(cityKey);
    if (!city) {
      city = await CityService.save({ nome: row.cidade, ativo: true });
      cityByName.set(cityKey, city);
    }

    const congKey = `${normalizeForComparison(row.congregacao)}|${city.id}`;
    let congregation = congByKey.get(congKey);
    if (!congregation) {
      congregation = await CongregationService.save({ nome: row.congregacao, cidadeId: city.id, ativo: true });
      congByKey.set(congKey, congregation);
    }

    const key = duplicateKey(row);
    const matchIdx = existingYouth.findIndex((y) => {
      const c = congregations.find((cc) => cc.id === y.congregacaoId) || congregation;
      const cty = cities.find((cc) => cc.id === y.cidadeId) || city;
      const nome = normalizeForComparison(y.nome);
      const existingKey = y.dataNascimento
        ? `${nome}|${y.dataNascimento}|${normalizeForComparison(c?.nome || "")}`
        : `${nome}|${normalizeForComparison(c?.nome || "")}|${normalizeForComparison(cty?.nome || "")}`;
      return existingKey === key;
    });

    const payload = {
      codigo: row.codigo,
      nome: row.nome,
      dataNascimento: row.data_nascimento,
      naturalidade: row.naturalidade,
      telefone: row.telefone,
      celular: row.celular,
      endereco: row.endereco,
      numero: row.numero,
      bairro: row.bairro,
      cep: row.cep,
      cidadeId: city.id,
      congregacaoId: congregation.id,
      status: row.status,
      rg: row.rg,
      orgaoEmissor: row.orgao_emissor,
      cpf: row.cpf,
      escolaridade: row.escolaridade,
      profissao: row.profissao,
      cargo: row.cargo,
      outroEstadoCivil: row.outro_estado_civil,
      conjuge: row.conjuge,
      nomePai: row.pai,
      nomeMae: row.mae,
      pastor: row.pastor,
      conselheiroLocal: row.conselheiro_local,
      conselheiroCidade: row.conselheiro_cidade,
      dataBatismoAguas: row.data_batismo_aguas,
      batizadoEspiritoSanto: row.batizado_espirito_santo === true ? true : row.batizado_espirito_santo === false ? false : null,
      instrumento: row.instrumento,
      prega: row.prega,
      canta: row.canta,
      outrosTalentos: row.outros_talentos,
      qtd: row.qtd,
      estadoCivil: row.estado_civil,
      liderExpansao: row.lider_expansao,
      seLider: row.se_lider,
      qualDepartamento: row.qual_departamento,
      nomeDirigente: row.nome_dirigente,
      recebidoPor: row.recebido_por,
      tipoAdmissao: row.tipo_admissao,
      observacoes: row.observacoes,
    };

    if (matchIdx >= 0 && (row.rowStatus !== "duplicada" || duplicateStrategy === "atualizar")) {
      await YouthRepository.save({ ...existingYouth[matchIdx], ...payload, updatedAt: new Date().toISOString() });
      atualizados++;
    } else if (matchIdx >= 0 && duplicateStrategy === "importar") {
      await YouthRepository.save({ id: crypto.randomUUID(), ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      criados++;
    } else if (matchIdx < 0) {
      await YouthRepository.save({ id: crypto.randomUUID(), ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      criados++;
    } else {
      ignorados++;
    }
  }

  const result = { criados, atualizados, ignorados, erros };

  await ImportHistoryRepository.save({
    id: crypto.randomUUID(),
    nomeArquivo: fileName || "arquivo",
    formato: fileFormat || "csv",
    totalLinhas: rows.length,
    ...result,
    createdAt: new Date().toISOString(),
  });

  return result;
}

export function buildErrorsCSV(rows) {
  const problemRows = rows.filter((r) => r.rowStatus === "invalida" || r.rowStatus === "aviso");
  const headers = ["nome", "cidade", "congregacao", "status_importacao", "problemas"];
  const lines = [headers.join(",")];
  for (const row of problemRows) {
    const problems = [...row.errors, ...row.warnings].join(" | ").replace(/"/g, "'");
    lines.push([row.nome, row.cidade, row.congregacao, row.rowStatus, `"${problems}"`].join(","));
  }
  return lines.join("\r\n");
}
