import type { Child } from './children'

export function gradeStageLabel(child: Pick<Child, 'grade' | 'grade_stage'>): string {
  return child.grade_stage === 'incoming_grade_7' ? '即將升國一' : `國中 ${child.grade} 年級`
}
