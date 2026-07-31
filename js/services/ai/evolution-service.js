import { YouthService } from "../youth-service.js";
import { CityService } from "../city-service.js";
import { monthlyCounts, MONTH_LABELS } from "../dashboard-service.js";
import { parseCSV } from "../../parsers/csv-parser.js";
import { readWorkbook, listSheetNames, parseSheet } from "../../parsers/excel-parser.js";

/**
 * Funcionalidade 15 -- Histórico de evolução.
 *
 * The system has no audit/history table and no periodic snapshots -- the
 * only genuinely historical field on a youth record is `createdAt`
 * (when the cadastro entered the system) and `dataEntrada`/
 * `dataBatismoAguas` (already used by the Dashboard's own "por mês" charts
 * via dashboard-service.js's monthlyCounts(), reused here instead of
 * duplicated). That's real data, not invented -- so registration/admission/
 * baptism trends over time ARE available and safe to show.
 *
 * Everything else the spec lists (completude ao longo do tempo, redução de
 * jovens sem conselheiro, evolução da cobertura ministerial) would require
 * point-in-time snapshots the system never took. Per the spec's own
 * instruction ("não inventar tendências... não comparar períodos
 * inexistentes"), those are NOT computed here. Instead, an administrator
 * can import a CSV/XLSX snapshot from an earlier export/backup for a
 * one-off, session-only comparison (compareWithImportedSnapshot) -- never
 * saved anywhere, never sent to the AI before the admin reviews and
 * confirms the parsed preview.
 */
export const EvolutionService = {
  hasSufficientHistory(youth) {
    const withCreatedAt = youth.filter((y) => !!y.createdAt);
    if (!withCreatedAt.length) return false;
    const years = new Set(withCreatedAt.map((y) => y.createdAt.slice(0, 4)));
    return years.size >= 1 && withCreatedAt.length >= 5;
  },

  /** Real, non-invented evolution based on createdAt/dataEntrada/dataBatismoAguas. */
  async getRegistrationEvolution({ years } = {}) {
    const youth = await YouthService.list();
    if (!this.hasSufficientHistory(youth)) {
      return { insufficientData: true, message: "O sistema ainda possui apenas uma fotografia atual dos cadastros -- não há histórico suficiente para uma análise de evolução." };
    }

    const yearsWithData = [...new Set(youth.filter((y) => y.createdAt).map((y) => Number(y.createdAt.slice(0, 4))))].sort();
    const targetYears = years && years.length ? years : yearsWithData.slice(-3);

    const byYear = targetYears.map((year) => ({
      year,
      cadastros: monthlyCounts(youth, (y) => y.createdAt?.slice(0, 10), year),
      admissoes: monthlyCounts(youth, (y) => y.dataEntrada, year),
      batismos: monthlyCounts(youth, (y) => y.dataBatismoAguas, year),
    }));

    return {
      insufficientData: false,
      labels: MONTH_LABELS,
      byYear,
      limitations: [
        "Reflete apenas quando o cadastro foi criado no sistema (createdAt), não necessariamente quando o jovem passou a frequentar.",
        "O sistema não armazena um histórico de completude, conselheiro ou cobertura ministerial ao longo do tempo -- apenas a situação atual.",
      ],
    };
  },

  /**
   * Parses an uploaded CSV/XLSX/JSON file entirely in the browser (never
   * uploaded anywhere) so an admin can compare a past export against the
   * current data for one session. Nothing here is persisted.
   */
  async parseHistoricalFile(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".json")) {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rows = Array.isArray(parsed) ? parsed : parsed?.data?.youth || [];
      return { rows, columns: rows.length ? Object.keys(rows[0]) : [] };
    }
    if (name.endsWith(".csv")) {
      const text = await file.text();
      const { headers, records } = parseCSV(text);
      return { rows: records, columns: headers };
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      const workbook = readWorkbook(buffer);
      const sheetName = listSheetNames(workbook)[0];
      const { headers, records } = parseSheet(workbook, sheetName);
      return { rows: records, columns: headers };
    }
    throw new Error("Formato de arquivo não suportado. Envie um arquivo .csv, .xlsx ou .json.");
  },

  /** Best-effort comparison; loose column matching since imported files may use different headers/casing. */
  async compareWithImportedSnapshot(importedRows) {
    const currentYouth = await YouthService.list();
    const cities = await CityService.list();
    const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.nome]));

    const findField = (row, candidates) => {
      const keys = Object.keys(row);
      const match = keys.find((k) => candidates.includes(k.toLowerCase().trim()));
      return match ? row[match] : undefined;
    };

    const importedTotal = importedRows.length;
    const currentTotal = currentYouth.length;
    const currentByCity = {};
    currentYouth.forEach((y) => {
      const name = cityMap[y.cidadeId] || "Não informado";
      currentByCity[name] = (currentByCity[name] || 0) + 1;
    });
    const importedByCity = {};
    importedRows.forEach((row) => {
      const cidade = findField(row, ["cidade", "city"]) || "Não informado";
      importedByCity[cidade] = (importedByCity[cidade] || 0) + 1;
    });

    const allCityNames = new Set([...Object.keys(currentByCity), ...Object.keys(importedByCity)]);
    const perCity = [...allCityNames].map((cidade) => ({
      cidade,
      anterior: importedByCity[cidade] || 0,
      atual: currentByCity[cidade] || 0,
      diferenca: (currentByCity[cidade] || 0) - (importedByCity[cidade] || 0),
    }));

    return {
      totalAnterior: importedTotal,
      totalAtual: currentTotal,
      diferencaTotal: currentTotal - importedTotal,
      percentualCrescimento: importedTotal ? Math.round(((currentTotal - importedTotal) / importedTotal) * 1000) / 10 : null,
      perCity,
      limitations: [
        "Arquivos importados manualmente podem ter estrutura, nomes de coluna ou qualidade diferentes dos dados atuais -- esta comparação é uma estimativa.",
        "Registros que mudaram de cidade ou foram renomeados podem não ser correspondidos corretamente entre os dois conjuntos.",
      ],
    };
  },
};
