import type { ProfileDraft } from '../../lib/profile-form'

export type OnboardingStepProps = {
  draft: ProfileDraft
  errors: Record<string, string>
  update: (patch: Partial<ProfileDraft>) => void
}

export const levels = [
  { value: 'needs-support', label: '需要較多引導' },
  { value: 'developing', label: '基礎正在建立' },
  { value: 'on-level', label: '大致符合年級' },
  { value: 'advanced', label: '可接受進階挑戰' },
]

