import { useEffect, useState, type MouseEvent } from 'react'
import { parseRoute, type Route } from './routes'

const routeChangeEvent = 'paper-english:route-change'
const historyIndexKey = 'paperEnglishRouteIndex'
let historyIndex = 0
let restoringHistory = false
let currentHistoryUrl = ''
const routeSubscribers = new Set<() => void>()

function allowNavigation() {
  return window.dispatchEvent(new Event('paper-english:before-navigate', { cancelable: true }))
}

function initializeHistory() {
  const existing = window.history.state?.[historyIndexKey]
  historyIndex = typeof existing === 'number' ? existing : 0
  window.history.replaceState({ ...window.history.state, [historyIndexKey]: historyIndex }, '')
  currentHistoryUrl = window.location.href
}

export function replaceRouteUrl(path: string) {
  window.history.replaceState(window.history.state, '', path)
  currentHistoryUrl = window.location.href
}

function handleHistoryNavigation(event: PopStateEvent) {
  const nextIndex = event.state?.[historyIndexKey]
  if (restoringHistory) {
    restoringHistory = false
    return
  }
  // A traversal has already changed the URL. Restore the original entry before
  // allowing the reader to unmount when a save is pending or has failed.
  if (window.location.href !== currentHistoryUrl && !allowNavigation()) {
    if (typeof nextIndex === 'number' && nextIndex !== historyIndex) {
      restoringHistory = true
      window.history.go(historyIndex - nextIndex)
    } else {
      // Older sessions and native hash entries may have no managed index.
      // Keep the mounted draft and restore its URL without guessing direction.
      window.history.replaceState({ ...window.history.state, [historyIndexKey]: historyIndex }, '', currentHistoryUrl)
    }
    return
  }
  if (typeof nextIndex === 'number') historyIndex = nextIndex
  currentHistoryUrl = window.location.href
  routeSubscribers.forEach(update => update())
}

export function navigate(path: string) {
  if (typeof window === 'undefined') return
  if (restoringHistory || !allowNavigation()) return
  if (typeof window.history.state?.[historyIndexKey] !== 'number') initializeHistory()
  const browserPath = path.startsWith('/') ? path : `/${path}`
  const nextUrl = new URL(browserPath, window.location.origin)
  const currentUrl = new URL(window.location.href)
  const sameDocument = currentUrl.pathname === nextUrl.pathname && currentUrl.search === nextUrl.search

  if (currentUrl.pathname + currentUrl.search + currentUrl.hash !== nextUrl.pathname + nextUrl.search + nextUrl.hash) {
    historyIndex += 1
    window.history.pushState({ [historyIndexKey]: historyIndex }, '', browserPath)
    currentHistoryUrl = window.location.href
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
    if (routeSubscribers.size === 0) {
      initializeHistory()
      window.addEventListener('popstate', handleHistoryNavigation)
    }
    routeSubscribers.add(update)
    window.addEventListener(routeChangeEvent, update)
    return () => {
      routeSubscribers.delete(update)
      if (routeSubscribers.size === 0) window.removeEventListener('popstate', handleHistoryNavigation)
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
