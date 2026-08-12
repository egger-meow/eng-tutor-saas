export function buildAuthRedirectUrl(origin: string, basePath: string): string {
  return new URL(basePath, `${origin.replace(/\/$/, '')}/`).toString()
}
