import { describe, expect, it } from 'vitest'
import { addBasePath, parseRoute, stripBasePath } from './routes'

describe('hosted route paths', () => {
  it('removes the GitHub Pages repository prefix before matching', () => {
    expect(parseRoute(stripBasePath('/eng-tutor-saas/children/child-1/edit', '/eng-tutor-saas/'))).toMatchObject({ name: 'child-edit', params: { id: 'child-1' } })
  })

  it('adds the repository prefix when navigating in production', () => {
    expect(addBasePath('/billing', '/eng-tutor-saas/')).toBe('/eng-tutor-saas/billing')
    expect(addBasePath('/billing', '/')).toBe('/billing')
    expect(addBasePath('/#pricing', '/eng-tutor-saas/')).toBe('/eng-tutor-saas/#pricing')
  })

  it('keeps the public sample route addressable', () => {
    expect(parseRoute('/sample')).toMatchObject({ name: 'sample', path: '/sample' })
  })

  it('keeps the parent guide and feedback route addressable', () => {
    expect(parseRoute('/parent-guide-feedback')).toMatchObject({ name: 'parent-guide-feedback', path: '/parent-guide-feedback' })
    expect(parseRoute(stripBasePath('/eng-tutor-saas/parent-guide-feedback', '/eng-tutor-saas/'))).toMatchObject({ name: 'parent-guide-feedback' })
  })
})
