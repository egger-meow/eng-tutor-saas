export const SCOPED_MATERIAL_TOKEN_KEY = 'paper-english:scoped-material-token'

type SessionTokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function captureScopedMaterialToken(
  search: string,
  storage: SessionTokenStorage,
  removeVisibleToken: () => void,
): string | null {
  const queryToken = new URLSearchParams(search).get('t')
  if (queryToken) {
    try { storage.setItem(SCOPED_MATERIAL_TOKEN_KEY, queryToken) } catch { /* direct access still works */ }
    removeVisibleToken()
    return queryToken
  }
  try { return storage.getItem(SCOPED_MATERIAL_TOKEN_KEY) } catch { return null }
}

export function forgetScopedMaterialToken(storage: SessionTokenStorage): void {
  try { storage.removeItem(SCOPED_MATERIAL_TOKEN_KEY) } catch { /* no retained token */ }
}
