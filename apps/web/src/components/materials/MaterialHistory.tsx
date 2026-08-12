import type { Material } from '../../lib/materials'
import { MaterialHistoryItem } from './MaterialHistoryItem'

type MaterialHistoryProps = { materials: Material[]; childName: string; onFeedbackSaved: () => void }

export function MaterialHistory({ materials, childName, onFeedbackSaved }: MaterialHistoryProps) {
  if (materials.length === 0) return <p className="empty-state">第一份教材準備完成後，會出現在這裡。</p>
  return (
    <div className="material-history">
      {materials.map((material) => <MaterialHistoryItem key={material.id} material={material} childName={childName} onFeedbackSaved={onFeedbackSaved} />)}
    </div>
  )
}

