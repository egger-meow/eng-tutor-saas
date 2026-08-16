import { useCallback, useEffect, useState } from 'react'
import { listChildProfiles, type ChildProfile } from '../lib/child-profiles'
import { listChildren, type Child } from '../lib/children'
import { listMaterials, type Material } from '../lib/materials'
import { listOwnedSubscriptions, type SubscriptionView } from '../lib/subscriptions'

export type ChildWithProfile = Child & {
  profile: ChildProfile | null
  subscription?: SubscriptionView | null
  next_job_release_at?: string | null
  has_past_due_job?: boolean
}

export function chooseOwnedChild(children: ChildWithProfile[], requestedId: string | null): ChildWithProfile | null {
  return children.find((child) => child.id === requestedId) ?? children[0] ?? null
}

export function useParentData() {
  const [children, setChildren] = useState<ChildWithProfile[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [materialOffsets, setMaterialOffsets] = useState<Record<string, number>>({})
  const [materialHasMore, setMaterialHasMore] = useState<Record<string, boolean>>({})
  const [loadingMoreMaterials, setLoadingMoreMaterials] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [childRows, subscriptions] = await Promise.all([
        listChildren(),
        listOwnedSubscriptions(),
      ])
      const subscriptionMap = new Map(subscriptions.map((sub) => [sub.childId, sub]))
      const profiles = await listChildProfiles(childRows.map((child) => child.id))
      const profileMap = new Map(profiles.map((profile) => [profile.child_id, profile]))
      const childIds = childRows.map((c) => c.id)
      const page = childIds.length > 0 ? await listMaterials(childIds) : { materials: [], hasMoreByChild: {}, nextJobReleaseAtByChild: {}, hasPastDueUnmaterializedJobByChild: {} }
      const joined = childRows.map((child) => ({
        ...child,
        profile: profileMap.get(child.id) ?? null,
        subscription: subscriptionMap.get(child.id) ?? null,
        next_job_release_at: page.nextJobReleaseAtByChild[child.id] ?? null,
        has_past_due_job: Boolean(page.hasPastDueUnmaterializedJobByChild[child.id]),
      }))
      setChildren(joined)
      setMaterials(page.materials)
      setMaterialOffsets(Object.fromEntries(childIds.map((childId) => [childId, 5])))
      setMaterialHasMore(page.hasMoreByChild)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法讀取家長資料，請稍後再試。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const getMaterialsForChild = useCallback(
    (childId: string) => materials.filter((m) => m.child_id === childId),
    [materials]
  )

  const loadMoreMaterials = useCallback(async (childId: string) => {
    if (!materialHasMore[childId] || loadingMoreMaterials[childId]) return
    setLoadingMoreMaterials((current) => ({ ...current, [childId]: true }))
    try {
      const page = await listMaterials([childId], { offset: materialOffsets[childId] ?? 0 })
      setMaterials((current) => [...current, ...page.materials])
      setMaterialOffsets((current) => ({ ...current, [childId]: (current[childId] ?? 0) + 5 }))
      setMaterialHasMore((current) => ({ ...current, ...page.hasMoreByChild }))
    } finally {
      setLoadingMoreMaterials((current) => ({ ...current, [childId]: false }))
    }
  }, [loadingMoreMaterials, materialHasMore, materialOffsets])

  return { children, materials, loading, error, getMaterialsForChild, loadMoreMaterials, loadingMoreMaterials, materialHasMore, refresh }
}
