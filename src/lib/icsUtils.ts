// Simple ID generator (no external dep needed)
export function v4Fallback(): string {
  return 'ics-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}
