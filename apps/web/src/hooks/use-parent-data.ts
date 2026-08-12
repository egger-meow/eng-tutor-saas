import { useCallback, useEffect, useState } from 'react'
import { listChildProfiles, type ChildProfile } from '../lib/child-profiles'
import { listChildren, type Child } from '../lib/children'
import { listMaterials, type Material } from '../lib/materials'

export type ChildWithProfile = Child & { profile: ChildProfile | null }

export function chooseOwnedChild(children: ChildWithProfile[], requestedId: string | null): ChildWithProfile | null {
  return children.find((child) => child.id === requestedId) ?? children[0] ?? null
}

export function useParentData() {
  const [children, setChildren] = useState<ChildWithProfile[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const childRows = await listChildren()
      const profiles = await listChildProfiles(childRows.map((child) => child.id))
      const profileMap = new Map(profiles.map((profile) => [profile.child_id, profile]))
      const joined = childRows.map((child) => ({ ...child, profile: profileMap.get(child.id) ?? null }))
      const allMaterials = joined.length > 0 ? await listMaterials(joined.map((c) => c.id)) : []
      setChildren(joined)
      setMaterials(allMaterials)
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

  return { children, materials, loading, error, getMaterialsForChild, refresh }
}
