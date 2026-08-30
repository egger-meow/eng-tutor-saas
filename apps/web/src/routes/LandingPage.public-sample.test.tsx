import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LandingPage } from './LandingPage'

describe('Landing Page — public Week 3 sample', () => {
  it('shows the real Week 3 sample story and keeps the student/parent PDF pair aligned', () => {
    const html = renderToStaticMarkup(<LandingPage />)

    expect(html).toContain('真實第 3 週範例')
    expect(html).toContain('這不是為廣告另外做的展示教材')
    expect(html).toContain('How Does a Game Place Sound Around You?')
    expect(html).toContain('預計 94 分鐘')
    expect(html).toContain('spatial audio 閱讀＋at/on/in＋distance/direction/obstruction 推論')
    expect(html).toContain('/samples/sample-student.pdf')
    expect(html).toContain('/samples/sample-parent-answer.pdf')
    expect(html).not.toContain('The Signal Door Test')
  })
})
