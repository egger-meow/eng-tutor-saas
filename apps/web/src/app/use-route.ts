import { useEffect, useState, type MouseEvent } from 'react'
import { parseRoute, type Route } from './routes'

const routeChangeEvent = 'paper-english:route-change'

export function navigate(path: string) {
  if (typeof window === 'undefined') return
  const browserPath = path.startsWith('/') ? path : `/${path}`
  const nextUrl = new URL(browserPath, window.location.origin)
  const currentUrl = new URL(window.location.href)
  const sameDocument = currentUrl.pathname === nextUrl.pathname && currentUrl.search === nextUrl.search

  if (currentUrl.pathname + currentUrl.search + currentUrl.hash !== nextUrl.pathname + nextUrl.search + nextUrl.hash) {
    window.history.pushState({}, '', browserPath)
    window.dispatchEvent(new Event(routeChangeEvent))
  }

  if (nextUrl.hash) {
    window.requestAnimationFrame(() => document.getElementById(decodeURIComponent(nextUrl.hash.slice(1)))?.scrollIntoView({ block: 'start' }))
  } else if (!sameDocument) {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
}

export function useRoute(): Route {
  const readRoute = () => parseRoute(typeof window !== 'undefined' ? window.location.pathname : '/')
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    if (typeof window === 'undefined') return
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
