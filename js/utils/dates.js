import { AGE_RANGES } from "../config/constants.js";

const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30));

/** Parses many date formats and returns YYYY-MM-DD, or null if invalid/absent. */
export function normalizeDate(value) {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !isNaN(value)) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const d = new Date(EXCEL_EPOCH.getTime() + value * 86400000);
    if (isNaN(d)) return null;
    return d.toISOString().slice(0, 10);
  }

  const str = String(value).trim();
  if (!str) return null;

  let match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return isValidDateParts(+match[1], +match[2], +match[3]) ? str.slice(0, 10) : null;
  }

  match = str.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    if (!isValidDateParts(+yyyy, +mm, +dd)) return null;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const asNumber = Number(str);
  if (!isNaN(asNumber) && str.length <= 6) {
    return normalizeDate(asNumber);
  }

  return null;
}

function isValidDateParts(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export function calculateAge(birthDateStr, referenceDate = new Date()) {
  if (!birthDateStr) return null;
  const [year, month, day] = birthDateStr.split("-").map(Number);
  if (!year) return null;
  let age = referenceDate.getFullYear() - year;
  const hasHadBirthdayThisYear =
    referenceDate.getMonth() + 1 > month ||
    (referenceDate.getMonth() + 1 === month && referenceDate.getDate() >= day);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function getAgeRangeKey(age) {
  if (age === null || age === undefined) return "nao_informado";
  const range = AGE_RANGES.find((r) => age >= r.min && age <= r.max);
  return range ? range.key : "nao_informado";
}

export function isBirthdayInMonth(birthDateStr, month) {
  if (!birthDateStr) return false;
  const [, m] = birthDateStr.split("-").map(Number);
  return m === month;
}

/**
 * Checks the next 7 days (today included) for a birthday, comparing only
 * month/day so the birth year never matters -- handles month/year wraparound
 * (e.g. Dec 29 checked against a Jan 2 birthday) correctly.
 */
export function isBirthdayInWeek(birthDateStr, referenceDate = new Date()) {
  if (!birthDateStr) return false;
  const [, month, day] = birthDateStr.split("-").map(Number);
  if (!month || !day) return false;
  for (let i = 0; i < 7; i++) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + i);
    if (d.getMonth() + 1 === month && d.getDate() === day) return true;
  }
  return false;
}

export function formatDateBR(dateStr) {
  if (!dateStr) return "Não informado";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function isPastDate(dateStr) {
  return dateStr < todayISO();
}

export function isFutureOrTodayDate(dateStr) {
  return dateStr >= todayISO();
}
