import type { ChildWithProfile } from '../../hooks/use-parent-data'

type ChildSwitcherProps = {
  options: ChildWithProfile[]
  selectedChildId: string | null
  onChange: (childId: string) => void
}

export function ChildSwitcher({ options, selectedChildId, onChange }: ChildSwitcherProps) {
  if (options.length < 2) return null
  return (
    <label className="child-switcher">
      <span>目前孩子</span>
      <select value={selectedChildId ?? ''} onChange={(event) => onChange(event.target.value)}>
        {options.map((child) => <option key={child.id} value={child.id}>{child.display_name}</option>)}
      </select>
    </label>
  )
}
