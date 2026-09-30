// Only consume the authorized student projection. Unknown presentation kinds
// retain their prose without displaying structural IDs or internal metadata.
function projectedText(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(projectedText)
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) =>
    /^(type|id|.*Ids?|responseUnitId|targetIds|.*answer.*|.*explanation.*|.*evidence.*|.*tracking.*|.*snapshot.*)$/i.test(key)
      ? [] : projectedText(child))
}

export function ProjectedContent({ value }: { value: unknown }) {
  const texts = projectedText(value)
  return <div className="projected-content">{texts.length ? texts.map((text, index) => <p key={index}>{text}</p>) : <p>這個版型請搭配空白列印版閱讀。</p>}</div>
}
