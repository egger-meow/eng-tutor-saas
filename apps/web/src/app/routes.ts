export type RouteName =
  | 'landing'
  | 'about'
  | 'guide'
  | 'sample'
  | 'waitlist'
  | 'material'
  | 'authenticated-material'
  | 'dashboard'
  | 'child-new'
  | 'child-overview'
  | 'child-edit'
  | 'child-materials'
  | 'feedback'
  | 'parent-guide-feedback'
  | 'billing'
  | 'privacy'
  | 'terms'
  | 'refund'

export type Route = {
  name: RouteName
  params: Record<string, string>
  path: string
}

const staticRoutes = new Map<string, RouteName>([
  ['/', 'landing'],
  ['/about', 'about'],
  ['/guide', 'guide'],
  ['/sample', 'sample'],
  ['/waitlist', 'waitlist'],
  ['/material', 'material'],
  ['/dashboard', 'dashboard'],
  ['/parent-guide-feedback', 'parent-guide-feedback'],
  ['/children', 'child-overview'],
  ['/children/new', 'child-new'],
  ['/billing', 'billing'],
  ['/privacy', 'privacy'],
  ['/terms', 'terms'],
  ['/refund', 'refund'],
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

  const materialMatch = path.match(/^\/materials\/([^/]+)$/)
  if (materialMatch) return { name: 'authenticated-material', params: { materialId: decodeURIComponent(materialMatch[1]) }, path }

  return { name: 'landing', params: {}, path: '/' }
}
