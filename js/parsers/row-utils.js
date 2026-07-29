/**
 * Shared helpers for csv-parser.js and excel-parser.js: real-world spreadsheets
 * often start with a merged title/banner row and one or more blank spacer rows
 * before the actual header row (e.g. "CONTROLE GERAL - EXPANSÃO" followed by
 * six empty rows, then the real column headers). Both parsers already drop
 * fully-blank rows; this drops leading rows that only have a couple of filled
 * cells while the very next row is clearly a real, densely-filled header row.
 */
function countNonEmpty(row) {
  return row.filter((cell) => String(cell ?? "").trim() !== "").length;
}

const MAX_LEADING_ROWS_TO_SKIP = 10;

export function stripLeadingNoiseRows(rows) {
  let result = rows;
  let skipped = 0;
  while (result.length > 1 && skipped < MAX_LEADING_ROWS_TO_SKIP) {
    const currentCount = countNonEmpty(result[0]);
    const nextCount = countNonEmpty(result[1]);
    const looksLikeBanner = currentCount > 0 && currentCount <= 2 && nextCount > currentCount + 1;
    if (!looksLikeBanner) break;
    result = result.slice(1);
    skipped += 1;
  }
  return result;
}
