/** Wraps SheetJS (window.XLSX, loaded via CDN in index.html/pages) for .xls/.xlsx files. */
export function readWorkbook(arrayBuffer) {
  if (!window.XLSX) throw new Error("Biblioteca SheetJS (XLSX) não carregada.");
  return window.XLSX.read(arrayBuffer, { type: "array", cellDates: true });
}

export function listSheetNames(workbook) {
  return workbook.SheetNames;
}

export function parseSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], records: [] };

  const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
  const filteredRows = rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
  if (!filteredRows.length) return { headers: [], records: [] };

  const headers = filteredRows[0].map((h) => String(h).trim());
  const records = filteredRows.slice(1).map((r) => {
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = r[idx] ?? "";
    });
    return record;
  });

  return { headers, records };
}
