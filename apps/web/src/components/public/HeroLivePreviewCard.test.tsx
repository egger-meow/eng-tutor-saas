import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { HeroLivePreviewCard, STUDENT_PERSONAS } from './HeroLivePreviewCard'

describe('HeroLivePreviewCard', () => {
  it('renders initial persona (basketball) with authentic excerpt, vocabulary, and CAP alignment in static markup', () => {
    const html = renderToStaticMarkup(<HeroLivePreviewCard />)

    expect(html).toContain('THIS WEEK · FOR ONE CHILD')
    expect(html).toContain('國一 基礎銜接')
    expect(html).toContain('The Last Shot: Teamwork Under Pressure')
    expect(html).toContain('During the final three minutes')
    expect(html).toContain('hesitate')
    expect(html).toContain('112 會考題型')
    expect(html).toContain('上週混淆單字 hesitate')
    expect(html).toContain('🔊 聽朗讀發音')
  })

  it('contains tab controls for all 3 authentic personas', () => {
    const html = renderToStaticMarkup(<HeroLivePreviewCard />)

    expect(html).toContain('🏀 國一·小宇（籃球）')
    expect(html).toContain('🎬 國二·晴晴（動漫）')
    expect(html).toContain('🐾 國三·翔翔（科普）')
  })

  it('verifies all 3 student personas have real content and CAP grounding', () => {
    expect(STUDENT_PERSONAS).toHaveLength(3)

    // Basketball (Grade 7)
    const p1 = STUDENT_PERSONAS[0]
    expect(p1.childName).toBe('小宇')
    expect(p1.gradeStage).toBe('國一 基礎銜接')
    expect(p1.vocabulary.some((v) => v.word === 'hesitate')).toBe(true)
    expect(p1.capAlignment).toContain('112 會考題型')

    // Anime (Grade 8)
    const p2 = STUDENT_PERSONAS[1]
    expect(p2.childName).toBe('晴晴')
    expect(p2.gradeStage).toBe('國二 核心素養')
    expect(p2.vocabulary.some((v) => v.word === 'compelling')).toBe(true)
    expect(p2.capAlignment).toContain('113 會考題型')

    // Science (Grade 9)
    const p3 = STUDENT_PERSONAS[2]
    expect(p3.childName).toBe('翔翔')
    expect(p3.gradeStage).toBe('國三 會考衝刺')
    expect(p3.vocabulary.some((v) => v.word === 'biodiversity')).toBe(true)
    expect(p3.capAlignment).toContain('111 會考題型')
  })
})
