import type { ChildWithProfile } from '../../hooks/use-parent-data'
import { handleInternalLink } from '../../app/use-route'
import { gradeStageLabel } from '../../lib/grade-stage'

export function ChildIdentity({ child }: { child: ChildWithProfile }) {
  return (
    <div className="child-identity">
      <div>
        <p className="eyebrow">本週陪伴</p>
        <h1>{child.display_name} 的英文學習</h1>
        <p className="muted">{gradeStageLabel(child)}{child.textbook_version ? ` · ${child.textbook_version}` : ''}</p>
      </div>
      <a className="text-link" href={`/children/${child.id}`} onClick={handleInternalLink}>查看學習資料</a>
    </div>
  )
}
