// frontend/lib/cvDates.ts — mirrors the date-splitting rule in the PDF renderer
const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const YM = `(?:${MONTH}\\s+)?\\d{4}`;
const RANGE = `${YM}\\s*[-–—]\\s*(?:${YM}|present|current|now)`;
const DATE_RE = new RegExp(`\\s+(${RANGE}|${MONTH}\\s+\\d{4})\\s*$`, "i");

/** "Title | Company  JAN 2026 – PRESENT" -> ["Title | Company", "JAN 2026 – PRESENT"] */
export function splitDate(line: string): [string, string] {
  const m = DATE_RE.exec(line);
  if (!m) return [line, ""];
  const left = line.slice(0, m.index).trimEnd();
  return left ? [left, m[1]] : [line, ""];
}