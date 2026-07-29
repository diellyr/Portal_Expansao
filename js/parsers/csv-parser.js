import { stripLeadingNoiseRows } from "./row-utils.js";

/**
 * Small dependency-free CSV parser supporting quoted fields, escaped quotes,
 * and both comma and semicolon delimiters (common in pt-BR exports).
 */
export function parseCSV(text) {
  const cleanText = text.replace(/^﻿/, "");
  const delimiter = detectDelimiter(cleanText);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const nonBlankRows = rows.filter((r) => r.some((cell) => cell.trim() !== ""));
  const filteredRows = stripLeadingNoiseRows(nonBlankRows);
  if (!filteredRows.length) return { headers: [], records: [] };

  const headers = filteredRows[0].map((h) => h.trim());
  const records = filteredRows.slice(1).map((r) => {
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = (r[idx] ?? "").trim();
    });
    return record;
  });

  return { headers, records };
}

function detectDelimiter(text) {
  // Scan the first several lines instead of only the first one, since a
  // leading title/banner line (common in exported spreadsheets) may not
  // contain the delimiter used by the actual header/data rows below it.
  const lines = text.split(/\r?\n/).slice(0, 20);
  let commaCount = 0;
  let semicolonCount = 0;
  for (const line of lines) {
    commaCount += (line.match(/,/g) || []).length;
    semicolonCount += (line.match(/;/g) || []).length;
  }
  return semicolonCount > commaCount ? ";" : ",";
}

export function toCSV(rows, headers) {
  const escape = (value) => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\r\n");
}
