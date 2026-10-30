export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function parseLeadInput(raw: string): string[] {
  const lines = raw
    .split(/\r?\n|,|;/)
    .map((part) => normalizeEmail(part.replace(/['"\s]/g, '')))
    .filter(Boolean)
    .filter((email) => isValidEmail(email));

  return [...new Set(lines)];
}
