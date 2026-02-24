/**
 * Strips trailing -1, -2, etc. suffix from serial numbers for display/export.
 * e.g. "708695-1" -> "708695", "709565" -> "709565"
 */
export function stripSerialSuffix(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  return s.replace(/-\d+$/, '') || s;
}
