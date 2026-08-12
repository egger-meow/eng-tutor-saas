import { useEffect, useState, type MouseEvent } from 'react'
import { addBasePath, parseRoute, stripBasePath, type Route } from './routes'

const routeChangeEvent = 'paper-english:route-change'

export function navigate(path: string) {
  const browserPath = addBasePath(path, import.meta.env.BASE_URL)
  if (window.location.pathname === browserPath) return
  window.history.pushState({}, '', browserPath)
  window.dispatchEvent(new Event(routeChangeEvent))
  window.scrollTo({ top: 0, behavior: 'auto' })
}

export function useRoute(): Route {
  const readRoute = () => parseRoute(stripBasePath(window.location.pathname, import.meta.env.BASE_URL))
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const update = () => setRoute(readRoute())
    window.addEventListener('popstate', update)
    window.addEventListener(routeChangeEvent, update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener(routeChangeEvent, update)
    }
  }, [])

  return route
}

export function handleInternalLink(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const href = event.currentTarget.getAttribute('href')
  if (!href?.startsWith('/')) return
  event.preventDefault()
  navigate(href)
}
