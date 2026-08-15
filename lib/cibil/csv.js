/**
 * lib/cibil/csv.js — turns an array of row objects into a downloaded CSV.
 * Columns are the union of keys across the rows, in first-seen order.
 */

function escapeCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") value = JSON.stringify(value);
  const str = String(value);
  // Quote when the value contains a comma, quote, or newline.
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function rowsToCsv(rows) {
  if (!rows || rows.length === 0) return "";

  const columns = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }

  const lines = [columns.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(row?.[c])).join(","));
  }
  return lines.join("\n");
}

export function downloadCsv(rows, filename) {
  const csv = rowsToCsv(rows);
  if (!csv) return false;

  // BOM so Excel opens UTF-8 (₹, names) correctly.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
