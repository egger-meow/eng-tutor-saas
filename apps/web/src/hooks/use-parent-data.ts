import { useCallback, useEffect, useState } from 'react'
import { listChildProfiles, type ChildProfile } from '../lib/child-profiles'
import { listChildren, type Child } from '../lib/children'
import { listMaterials, type Material } from '../lib/materials'
import { listOwnedSubscriptions, type SubscriptionView } from '../lib/subscriptions'
import { listOwnedWaitlist, type OwnedWaitlistEntry } from '../lib/waitlist'
import { getSupabaseClient } from '../lib/supabase'

export type ChildWithProfile = Child & {
  profile: ChildProfile | null
  subscription?: SubscriptionView | null
  waitlist?: OwnedWaitlistEntry | null
  next_job_release_at?: string | null
  has_past_due_job?: boolean
  has_active_generation_failure?: boolean
}

type ParentDataSnapshot = {
  children: ChildWithProfile[]
  materials: Material[]
  materialOffsets: Record<string, number>
  materialHasMore: Record<string, boolean>
  releasedMaterialCounts: Record<string, number>
}

const parentDataCache = new Map<string, { snapshot: ParentDataSnapshot; cachedAt: number }>()
const parentDataCacheTtlMs = 30_000
const emptySnapshot: ParentDataSnapshot = {
  children: [],
  materials: [],
  materialOffsets: {},
  materialHasMore: {},
  releasedMaterialCounts: {},
}

export function invalidateParentDataCache(parentUserId?: string): void {
  if (parentUserId) {
    parentDataCache.delete(parentUserId)
    return
  }
  parentDataCache.clear()
}

export function chooseOwnedChild(children: ChildWithProfile[], requestedId: string | null): ChildWithProfile | null {
  return children.find((child) => child.id === requestedId) ?? children[0] ?? null
}

export function useParentData(parentUserId: string) {
  const cached = parentDataCache.get(parentUserId)
  const [snapshot, setSnapshot] = useState<ParentDataSnapshot>(() => cached?.snapshot ?? emptySnapshot)
  const [hasSnapshot, setHasSnapshot] = useState(Boolean(cached))
  const [loadingMoreMaterials, setLoadingMoreMaterials] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(!hasSnapshot)
    setError('')
    try {
      const [childRows, subscriptions, waitlistEntries] = await Promise.all([
        listChildren(),
        listOwnedSubscriptions(),
        listOwnedWaitlist(getSupabaseClient()),
      ])
      const subscriptionMap = new Map(subscriptions.map((sub) => [sub.childId, sub]))
      const waitlistMap = new Map(waitlistEntries.map((w) => [w.childId, w]))
      const profiles = await listChildProfiles(childRows.map((child) => child.id))
      const profileMap = new Map(profiles.map((profile) => [profile.child_id, profile]))
      const childIds = childRows.map((child) => child.id)
      const page = childIds.length > 0 ? await listMaterials(childIds) : {
        materials: [],
        hasMoreByChild: {},
        releasedCountByChild: {},
        releasedLoadedByChild: {},
        nextJobReleaseAtByChild: {},
        hasPastDueUnmaterializedJobByChild: {},
        hasActiveGenerationFailureByChild: {},
      }
      const joined = childRows.map((child) => ({
        ...child,
        profile: profileMap.get(child.id) ?? null,
        subscription: subscriptionMap.get(child.id) ?? null,
        waitlist: waitlistMap.get(child.id) ?? null,
        next_job_release_at: page.nextJobReleaseAtByChild[child.id] ?? null,
        has_past_due_job: Boolean(page.hasPastDueUnmaterializedJobByChild[child.id]),
        has_active_generation_failure: Boolean(page.hasActiveGenerationFailureByChild?.[child.id]),
      }))
      const nextSnapshot = {
        children: joined,
        materials: page.materials,
        materialOffsets: page.releasedLoadedByChild,
        materialHasMore: page.hasMoreByChild,
        releasedMaterialCounts: page.releasedCountByChild,
      }
      parentDataCache.set(parentUserId, { snapshot: nextSnapshot, cachedAt: Date.now() })
      setSnapshot(nextSnapshot)
      setHasSnapshot(true)
    } catch {
      setError('目前無法更新孩子的學習資料，請稍後再試。')
    } finally {
      setLoading(false)
    }
  }, [hasSnapshot, parentUserId])

  useEffect(() => {
    const current = parentDataCache.get(parentUserId)
    if (current && Date.now() - current.cachedAt < parentDataCacheTtlMs) return
    void refresh()
  }, [parentUserId, refresh])

  const getMaterialsForChild = useCallback(
    (childId: string) => snapshot.materials.filter((material) => material.child_id === childId),
    [snapshot.materials]
  )

  const loadMoreMaterials = useCallback(async (childId: string) => {
    if (!snapshot.materialHasMore[childId] || loadingMoreMaterials[childId]) return
    setLoadingMoreMaterials((current) => ({ ...current, [childId]: true }))
    try {
      const page = await listMaterials([childId], { offset: snapshot.materialOffsets[childId] ?? 0, includeFuture: false })
      setSnapshot((current) => {
        const existingIds = new Set(current.materials.map((material) => material.id))
        const next = {
          ...current,
          materials: [...current.materials, ...page.materials.filter((material) => !existingIds.has(material.id))],
          materialOffsets: { ...current.materialOffsets, [childId]: (current.materialOffsets[childId] ?? 0) + (page.releasedLoadedByChild[childId] ?? 0) },
          materialHasMore: { ...current.materialHasMore, ...page.hasMoreByChild },
          releasedMaterialCounts: { ...current.releasedMaterialCounts, ...page.releasedCountByChild },
        }
        parentDataCache.set(parentUserId, { snapshot: next, cachedAt: Date.now() })
        return next
      })
    } finally {
      setLoadingMoreMaterials((current) => ({ ...current, [childId]: false }))
    }
  }, [loadingMoreMaterials, parentUserId, snapshot.materialHasMore, snapshot.materialOffsets])

  return { ...snapshot, loading, error, getMaterialsForChild, loadMoreMaterials, loadingMoreMaterials, refresh }
}
