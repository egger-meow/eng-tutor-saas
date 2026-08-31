import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { emptyProfileDraft } from '../../../lib/profile-form'
import { AboutStep } from './AboutStep'
import { RoutineStep } from './RoutineStep'
import { SchoolStep } from './SchoolStep'

const baseProps = {
  draft: emptyProfileDraft,
  errors: {},
  update: () => undefined,
}

describe('streamlined child onboarding', () => {
  it('uses broad interest categories instead of narrow named examples', () => {
    const html = renderToStaticMarkup(<SchoolStep {...baseProps} />)

    expect(html).toContain('interest-category-grid')
    expect(html).toContain('動漫與漫畫')
    expect(html).toContain('遊戲')
    expect(html).toContain('運動')
    expect(html).toContain('科學與科技')
    expect(html).toContain('先選大類')
    expect(html).not.toContain('排球少年 / 芙莉蓮')
    expect(html).not.toContain('Minecraft / 遊戲')
  })

  it('keeps secondary school and routine inputs visually optional', () => {
    const school = renderToStaticMarkup(<SchoolStep {...baseProps} />)
    const routine = renderToStaticMarkup(<RoutineStep {...baseProps} />)

    expect(school).toContain('onboarding-optional-details')
    expect(school).toContain('有想避開的內容再填')
    expect(routine).toContain('想自訂其他分鐘數')
    expect(routine).not.toContain('onboarding-reassurance-card')
  })

  it('uses familiar Taiwan school-stage wording', () => {
    const html = renderToStaticMarkup(<AboutStep {...baseProps} />)

    expect(html).toContain('國一')
    expect(html).toContain('國二')
    expect(html).toContain('國三')
    expect(html).not.toContain('國中七年級')
  })
})
