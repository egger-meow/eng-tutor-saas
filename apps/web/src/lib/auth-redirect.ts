export function buildAuthRedirectUrl(origin: string): string {
  return new URL('/', `${origin.replace(/\/$/, '')}/`).toString()
}
