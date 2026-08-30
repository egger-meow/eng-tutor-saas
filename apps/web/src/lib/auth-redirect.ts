export function buildAuthRedirectUrl(origin: string, params?: Record<string, string>): string {
  const url = new URL('/', `${origin.replace(/\/$/, '')}/`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value)
      }
    }
  }
  return url.toString()
}

