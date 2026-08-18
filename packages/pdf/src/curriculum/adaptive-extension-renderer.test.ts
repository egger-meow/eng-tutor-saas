import { describe, expect, it } from 'vitest'
import { renderAdaptiveExtension, ADAPTIVE_EXTENSION_PURPOSE_LABELS } from './adaptive-extension-renderer.js'

describe('adaptive-extension-renderer', () => {
  it('returns empty string when extension is null or undefined', () => {
    expect(renderAdaptiveExtension(null)).toBe('')
    expect(renderAdaptiveExtension(undefined)).toBe('')
  })

  it('renders strategy extension after reading with title, content, and task prompt', () => {
    const ext = {
      id: 'ext-strategy-1',
      placement: 'after-reading' as const,
      purpose: 'strategy' as const,
      titleZh: '會考長文閱讀策略：條件與轉折線索',
      contentZh: '當你讀到 If... 或 However 時，先停下來圈出因果或轉折關係，這通常是推論題的命題核心。',
      taskZh: '在文章中找出含有 If 的句子並用括號標記條件。',
      taskWritingLines: 2,
    }

    const html = renderAdaptiveExtension(ext)
    expect(html).toContain('class="adaptive-extension-card"')
    expect(html).toContain('data-placement="after-reading"')
    expect(html).toContain('data-purpose="strategy"')
    expect(html).toContain('【學習策略加深】')
    expect(html).toContain('會考長文閱讀策略：條件與轉折線索')
    expect(html).toContain('當你讀到 If... 或 However 時')
    expect(html).toContain('class="adaptive-extension-task"')
    expect(html).toContain('延伸小任務')
    expect(html).toContain('在文章中找出含有 If 的句子並用括號標記條件。')
    expect(html).toContain('class="writing-line"')
  })

  it('renders reasoning extension after practice without writing lines when taskWritingLines is 0', () => {
    const ext = {
      id: 'ext-reasoning-1',
      placement: 'after-practice' as const,
      purpose: 'reasoning' as const,
      titleZh: '動詞時態陷阱排查',
      contentZh: '檢查句子時，先抓出主詞是單數還是複數，再看時間副詞是一般現在還是過去。',
      taskZh: '口頭複述一次 do 與 does 的轉換心法。',
      taskWritingLines: 0,
    }

    const html = renderAdaptiveExtension(ext)
    expect(html).toContain('data-placement="after-practice"')
    expect(html).toContain('data-purpose="reasoning"')
    expect(html).toContain('【思維推論挑戰】')
    expect(html).toContain('動詞時態陷阱排查')
    expect(html).toContain('口頭複述一次 do 與 does 的轉換心法。')
    expect(html).not.toContain('class="writing-line"')
  })

  it('renders pronunciation, real-world-application, and creative-depth badges correctly', () => {
    expect(ADAPTIVE_EXTENSION_PURPOSE_LABELS['pronunciation']).toBe('發音與語調秘訣')
    expect(ADAPTIVE_EXTENSION_PURPOSE_LABELS['real-world-application']).toBe('真實語境應用')
    expect(ADAPTIVE_EXTENSION_PURPOSE_LABELS['creative-depth']).toBe('創意學習延伸')

    const pronunciationExt = {
      id: 'ext-pron-1',
      placement: 'after-reading' as const,
      purpose: 'pronunciation' as const,
      titleZh: '連音與句尾語調',
      contentZh: '一般疑問句句尾上揚，特殊疑問句句尾下降。',
      taskZh: null,
      taskWritingLines: 0,
    }

    const html = renderAdaptiveExtension(pronunciationExt)
    expect(html).toContain('【發音與語調秘訣】')
    expect(html).toContain('連音與句尾語調')
    expect(html).not.toContain('class="adaptive-extension-task"')
  })
})
