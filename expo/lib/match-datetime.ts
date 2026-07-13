const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function toMatchDateValue(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseMatchDateValue(value: string): Date | null {
  const trimmed = value.trim();
  if (!DATE_PATTERN.test(trimmed)) return null;

  const parsed = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

export function matchDateToIso(value: string): string | null {
  const parsed = parseMatchDateValue(value);
  return parsed ? parsed.toISOString() : null;
}

export function isoToMatchDateValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return toMatchDateValue();
  }

  return toMatchDateValue(date);
}