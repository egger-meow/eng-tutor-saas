import type { ChildWithProfile } from '../../hooks/use-parent-data'
import { ProfileSection } from './ProfileSection'

export function ProfileSummary({ child }: { child: ChildWithProfile }) {
  const profile = child.profile
  const interests = Array.isArray(profile?.preferences.interests) ? profile.preferences.interests.filter((item): item is string => typeof item === 'string') : []
  const specificInterestKeys = ['favoriteStories', 'favoriteGames', 'favoriteMusic', 'activities', 'currentFascinations'] as const
  const specificInterests = specificInterestKeys.map((key) => profile?.preferences[key]).filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  const interestSummary = specificInterests.length > 0 ? specificInterests.join('；') : interests.join('、')
  return <div className="profile-summary">
    <ProfileSection title="程度與課內進度"><dl><div><dt>整體程度</dt><dd>{profile?.baseline_level ?? '尚未填寫'}</dd></div><div><dt>課本</dt><dd>{child.textbook_version ?? '尚未填寫'}</dd></div><div><dt>目前進度</dt><dd>{profile?.school_progress ?? '尚未填寫'}</dd></div></dl></ProfileSection>
    <ProfileSection title="興趣與節奏"><dl><div><dt>具體興趣</dt><dd>{interestSummary || '尚未填寫'}</dd></div><div><dt>每週時間</dt><dd>{profile?.weekly_minutes ? `${profile.weekly_minutes} 分鐘` : '尚未填寫'}</dd></div></dl></ProfileSection>
    <ProfileSection title="目前目標"><p>{profile?.learning_goals ?? '尚未填寫學習目標。'}</p></ProfileSection>
  </div>
}
