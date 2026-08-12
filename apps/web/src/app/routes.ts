export type RouteName =
  | 'landing'
  | 'about'
  | 'guide'
  | 'waitlist'
  | 'dashboard'
  | 'child-new'
  | 'child-overview'
  | 'child-edit'
  | 'child-materials'
  | 'feedback'
  | 'billing'

export type Route = {
  name: RouteName
  params: Record<string, string>
  path: string
}

const staticRoutes = new Map<string, RouteName>([
  ['/', 'landing'],
  ['/about', 'about'],
  ['/guide', 'guide'],
  ['/waitlist', 'waitlist'],
  ['/dashboard', 'dashboard'],
  ['/children/new', 'child-new'],
  ['/billing', 'billing'],
])

function cleanPath(pathname: string) {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] || '/'
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, '') : withoutQuery
}

export function parseRoute(pathname: string): Route {
  const path = cleanPath(pathname)
  const staticName = staticRoutes.get(path)
  if (staticName) return { name: staticName, params: {}, path }

  const childMatch = path.match(/^\/children\/([^/]+)(?:\/(edit|materials))?$/)
  if (childMatch) {
    const [, id, childAction] = childMatch
    const name = childAction === 'edit'
      ? 'child-edit'
      : childAction === 'materials'
        ? 'child-materials'
        : 'child-overview'
    return { name, params: { id: decodeURIComponent(id) }, path }
  }

  const feedbackMatch = path.match(/^\/feedback\/([^/]+)$/)
  if (feedbackMatch) {
    return { name: 'feedback', params: { materialId: decodeURIComponent(feedbackMatch[1]) }, path }
  }

  return { name: 'landing', params: {}, path: '/' }
}

