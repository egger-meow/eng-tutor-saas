import { describe, expect, it } from 'vitest'
import { parseRoute } from './routes'

describe('root-hosted route paths', () => {
  it('routes the aggregate child profile page', () => {
    expect(parseRoute('/children')).toMatchObject({ name: 'child-overview', params: {} })
  })

  it('matches child routes directly from the domain root', () => {
    expect(parseRoute('/children/child-1/edit')).toMatchObject({ name: 'child-edit', params: { id: 'child-1' } })
  })

  it('keeps the public sample route addressable', () => {
    expect(parseRoute('/sample')).toMatchObject({ name: 'sample', path: '/sample' })
  })

  it('keeps the parent guide and feedback route addressable', () => {
    expect(parseRoute('/parent-guide-feedback')).toMatchObject({ name: 'parent-guide-feedback', path: '/parent-guide-feedback' })
  })

  it('keeps scoped material links public and query-insensitive', () => {
    expect(parseRoute('/material?t=secret')).toMatchObject({ name: 'material', path: '/material' })
  })

  it('keeps the Paddle default payment link route public and query-insensitive', () => {
    expect(parseRoute('/pay?_ptxn=txn_123')).toMatchObject({ name: 'pay', path: '/pay' })
  })

  it('routes a specific authenticated material', () => {
    expect(parseRoute('/materials/material-1')).toMatchObject({ name: 'authenticated-material', params: { materialId: 'material-1' } })
  })

  it.each([
    ['/', 'landing'],
    ['/terms', 'terms'],
    ['/privacy', 'privacy'],
    ['/refund', 'refund'],
  ] as const)('keeps public Paddle review route %s directly addressable', (path, name) => {
    expect(parseRoute(path)).toMatchObject({ name, path })
  })

  it('keeps the pricing anchor on the public landing route', () => {
    expect(parseRoute('/#pricing')).toMatchObject({ name: 'landing', path: '/' })
  })

  it('routes the parent announcements list page', () => {
    expect(parseRoute('/announcements')).toMatchObject({ name: 'announcements', path: '/announcements' })
    expect(parseRoute('/announcements?page=2')).toMatchObject({ name: 'announcements', path: '/announcements' })
  })

  it('routes a specific announcement detail page', () => {
    expect(parseRoute('/announcements/ann-123')).toMatchObject({
      name: 'announcement-detail',
      params: { id: 'ann-123' },
      path: '/announcements/ann-123',
    })
  })
})
