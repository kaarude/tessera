/** Convert any date-ish value into the local-tz `YYYY-MM-DDTHH:mm` string
 *  that a `<input type="datetime-local">` expects. Returns "" for
 *  empty/null/invalid values.
 */
export function toLocalInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" + pad(d.getMonth() + 1) +
    "-" + pad(d.getDate()) +
    "T" + pad(d.getHours()) +
    ":" + pad(d.getMinutes())
  );
}
