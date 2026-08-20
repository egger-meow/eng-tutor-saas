import { describe, expect, it } from 'vitest'
import { listOwnedWaitlist, getChildWaitlistStatus } from './waitlist'

describe('waitlist client library', () => {
  it('lists owned waitlist entries sorted by created_at', async () => {
    const mockRows = [
      {
        id: 'w-1',
        child_id: 'c-1',
        status: 'waiting',
        created_at: '2026-08-20T00:00:00Z',
        released_at: null,
        converted_at: null,
        notes: null,
      },
      {
        id: 'w-2',
        child_id: 'c-2',
        status: 'released',
        created_at: '2026-08-20T01:00:00Z',
        released_at: '2026-08-20T02:00:00Z',
        converted_at: null,
        notes: null,
      },
    ]

    const mockSupabase: any = {
      from: (table: string) => {
        expect(table).toBe('waitlist')
        return {
          select: () => ({
            order: (col: string, opts: any) => {
              expect(col).toBe('created_at')
              expect(opts.ascending).toBe(true)
              return Promise.resolve({ data: mockRows, error: null })
            },
          }),
        }
      },
    }

    const entries = await listOwnedWaitlist(mockSupabase)
    expect(entries).toHaveLength(2)
    expect(entries[0].childId).toBe('c-1')
    expect(entries[0].status).toBe('waiting')
    expect(entries[1].childId).toBe('c-2')
    expect(entries[1].status).toBe('released')
  })

  it('fetches child waitlist status by childId', async () => {
    const mockRow = {
      id: 'w-1',
      child_id: 'c-1',
      status: 'waiting',
      created_at: '2026-08-20T00:00:00Z',
      released_at: null,
      converted_at: null,
      notes: null,
    }

    const mockSupabase: any = {
      from: (table: string) => {
        expect(table).toBe('waitlist')
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              expect(col).toBe('child_id')
              expect(val).toBe('c-1')
              return {
                maybeSingle: () => Promise.resolve({ data: mockRow, error: null }),
              }
            },
          }),
        }
      },
    }

    const entry = await getChildWaitlistStatus(mockSupabase, 'c-1')
    expect(entry).not.toBeNull()
    expect(entry?.childId).toBe('c-1')
    expect(entry?.status).toBe('waiting')
  })

  it('returns null if child is not on waitlist', async () => {
    const mockSupabase: any = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    }

    const entry = await getChildWaitlistStatus(mockSupabase, 'c-none')
    expect(entry).toBeNull()
  })
})
