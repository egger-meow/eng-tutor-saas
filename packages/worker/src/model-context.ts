import { createHash } from 'node:crypto'

const REF = '$contextRef'
const GUIDE = 'Context encoding: an object containing only "$contextRef" is an exact copy of the value at that JSON Pointer in this same JSON document (decode ~1 as / and ~0 as ~). Resolve references before using the data; they are not missing evidence. Output ordinary canonical JSON, never context references.'
type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
const escapePointer = (key: string) => key.replaceAll('~', '~0').replaceAll('/', '~1')

/** Decode only an encoded presentation, not arbitrary claim data containing the reserved key. */
export function restoreModelContext(json: string): unknown {
  const complete = new Map<string, Json>()
  function visit(node: Json, path: string): Json {
    if (node === null || typeof node !== 'object') return node
    if (!Array.isArray(node) && Object.keys(node).length === 1 && Object.hasOwn(node, REF)) {
      const target = node[REF]
      if (typeof target !== 'string' || !complete.has(target)) throw new Error('Unresolved context reference')
      return complete.get(target)!
    }
    const result: Json = Array.isArray(node)
      ? node.map((entry, index) => visit(entry, `${path}/${index}`))
      : Object.fromEntries(Object.entries(node).map(([key, entry]) => [key, visit(entry, `${path}/${escapePointer(key)}`)]))
    complete.set(path, result)
    return result
  }
  return visit(JSON.parse(json), '')
}

export function measureContextText(text: string) {
  return { chars: text.length, bytes: Buffer.byteLength(text, 'utf8'), sha256: createHash('sha256').update(text).digest('hex') }
}

/** Exact serialized-value deduplication only. Never summarize, truncate, or modify a claim. */
export function serializeModelContext(value: Record<string, unknown>) {
  const original = JSON.stringify(value)
  const root: Json = JSON.parse(original)
  const seen = new Map<string, string>()
  const references: Array<{ path: string; target: string }> = []
  // Unknown data already using this key must retain its literal meaning.
  const hasReservedKey = (node: Json): boolean => node !== null && typeof node === 'object'
    && (Object.hasOwn(node, REF) || Object.values(node).some(hasReservedKey))
  function visit(node: Json, path: string): Json {
    if (node === null || typeof node !== 'object') return node
    const exact = JSON.stringify(node)
    const target = seen.get(exact)
    const reference = { [REF]: target! }
    // Small repeated values remain inline for readability; every replacement must save space.
    if (target !== undefined && exact.length >= 128 && JSON.stringify(reference).length < exact.length) {
      references.push({ path, target })
      return reference
    }
    const result: Json = Array.isArray(node)
      ? node.map((entry, index) => visit(entry, `${path}/${index}`))
      : Object.fromEntries(Object.entries(node).map(([key, entry]) => [key, visit(entry, `${path}/${escapePointer(key)}`)]))
    // Only earlier complete values can be targets, so references cannot form cycles.
    if (exact.length >= 128 && target === undefined) seen.set(exact, path)
    return result
  }
  let json = hasReservedKey(root) ? original : JSON.stringify(visit(root, ''))
  let text = references.length ? `${GUIDE}\n${json}` : original
  let faithful = true
  if (references.length) {
    try { faithful = JSON.stringify(restoreModelContext(json)) === original } catch { faithful = false }
  }
  // Include the decoding instruction in the saving, not only the JSON payload.
  if (!faithful || text.length >= original.length || Buffer.byteLength(text) >= Buffer.byteLength(original)) {
    json = original
    text = original
    references.length = 0
  }
  return { text, json, references, before: measureContextText(original), after: measureContextText(text) }
}
