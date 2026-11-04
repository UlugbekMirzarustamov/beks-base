/**
 * Short unique ids like "lq3k9x-4f8a2c".
 * (crypto.randomUUID only works on https/localhost, and we also want the app
 * to work when opened over Wi-Fi on a phone during development.)
 */
export function uid(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
