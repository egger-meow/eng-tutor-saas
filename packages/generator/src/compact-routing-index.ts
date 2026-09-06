/** Lossless table encoding: preserve every field and card, share repeated values. */
export function compactRoutingIndex(index: Record<string, unknown> & { cards: Record<string, unknown>[] }): string {
  const { cards, ...metadata } = index
  const columns = [...new Set(cards.flatMap(card => Object.keys(card)))]
  const dictionary: unknown[] = []
  const ids = new Map<string, number>()
  const rows = cards.map(card => columns.map(column => {
    if (!(column in card)) return -1
    const value = card[column]
    const key = JSON.stringify(value)
    let id = ids.get(key)
    if (id === undefined) {
      id = dictionary.length
      ids.set(key, id)
      dictionary.push(value)
    }
    return id
  }))
  // Explicit keys let readers resolve IDs without counting positions in a long array.
  return JSON.stringify({ ...metadata, encoding: 'dictionary-table-v1', columns, dictionary: Object.fromEntries(dictionary.map((value, id) => [id, value])), rows })
}
