/** Compare absolute instants. datetime-local values must be converted to ISO in the browser first. */
export function isFutureDeadline(value: string | Date | null | undefined, now: number | Date = Date.now()): boolean {
  if (value === null || value === undefined || value === '') return false;
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  const current = now instanceof Date ? now.getTime() : now;
  return Number.isFinite(timestamp) && Number.isFinite(current) && timestamp > current;
}

const aliases: Record<string,string> = { nodejs:'node.js', 'node js':'node.js', reactjs:'react', 'amazon web services':'aws', js:'javascript' };
export function normalizeJobSkill(value: string): string {
  const key=value.trim().replace(/\s+/g,' ').toLowerCase();
  return aliases[key] ?? key;
}
