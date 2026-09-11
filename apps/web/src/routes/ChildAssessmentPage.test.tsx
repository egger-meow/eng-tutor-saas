import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  AssessmentIntroView,
  AssessmentQuestionView,
  AssessmentResultView,
} from './ChildAssessmentPage'
import * as assessmentLib from '../lib/assessment'

describe('ChildAssessmentPage Subcomponents', () => {
  describe('AssessmentIntroView', () => {
    it('renders intro state with calm explanation and adaptive guidance', () => {
      const html = renderToStaticMarkup(
        <AssessmentIntroView onStart={() => {}} onExit={() => {}} />
      )

      expect(html).toContain('更精準了解目前程度')
      expect(html).toContain('這是一段簡短、溫和的英文程度診斷')
      expect(html).toContain('自適應出題')
      expect(html).toContain('題數會依作答情況調整')
      expect(html).toContain('隨時可以跳過')
      expect(html).toContain('我不確定，跳過這題')
      expect(html).toContain('進度自動保存')
      expect(html).toContain('這不是考試，作答不計時')
      expect(html).toContain('開始程度診斷')
      expect(html).toContain('暫停並返回學習頁')
    })
  })

  describe('AssessmentQuestionView', () => {
    const baseSessionState: assessmentLib.AssessmentSessionState = {
      sessionId: 's1111111-1111-1111-1111-111111111111',
      status: 'in_progress',
      itemsCompleted: 7,
      targetItemCount: 18,
      currentItem: null,
    }

    it('renders single choice item with progress and disabled submit when unselected', () => {
      const mcqItem: assessmentLib.AssessmentClientItem = {
        id: 'v_core_01',
        responseType: 'single_choice',
        prompt: 'Choose the word that best completes the sentence.',
        choices: [
          { id: 'A', text: 'apple' },
          { id: 'B', text: 'banana' },
          { id: 'C', text: 'orange' },
          { id: 'D', text: 'grape' },
        ],
      }

      const html = renderToStaticMarkup(
        <AssessmentQuestionView
          sessionState={baseSessionState}
          currentItem={mcqItem}
          rawAnswer=""
          isSubmitting={false}
          errorMessage={null}
          onAnswerChange={() => {}}
          onSubmit={() => {}}
          onSkip={() => {}}
          onExit={() => {}}
          onRetry={() => {}}
        />
      )

      expect(html).toContain('已完成 7 題')
      expect(html).toContain('題數會依作答情況調整')
      expect(html).toContain('Choose the word that best completes the sentence.')
      expect(html).toContain('apple')
      expect(html).toContain('banana')
      expect(html).toContain('disabled=""') // Submit button is disabled because rawAnswer is empty
      expect(html).toContain('我不確定，跳過這題')
      expect(html).toContain('暫停並返回學習頁')
    })

    it('renders selected single choice item with active state', () => {
      const mcqItem: assessmentLib.AssessmentClientItem = {
        id: 'v_core_01',
        responseType: 'single_choice',
        prompt: 'Choose the word that best completes the sentence.',
        choices: [
          { id: 'A', text: 'apple' },
          { id: 'B', text: 'banana' },
        ],
      }

      const html = renderToStaticMarkup(
        <AssessmentQuestionView
          sessionState={baseSessionState}
          currentItem={mcqItem}
          rawAnswer="B"
          isSubmitting={false}
          errorMessage={null}
          onAnswerChange={() => {}}
          onSubmit={() => {}}
          onSkip={() => {}}
          onExit={() => {}}
          onRetry={() => {}}
        />
      )

      expect(html).toContain('is-selected')
      expect(html).toContain('aria-checked="true"')
      // When answered, submit button is enabled (not disabled)
      expect(html).toContain('確認送出')
    })

    it('renders short answer question with input text field and hint', () => {
      const shortItem: assessmentLib.AssessmentClientItem = {
        id: 'g_struct_01',
        responseType: 'short_answer',
        prompt: 'Rewrite the sentence in negative form.',
      }

      const html = renderToStaticMarkup(
        <AssessmentQuestionView
          sessionState={baseSessionState}
          currentItem={shortItem}
          rawAnswer="They do not play"
          isSubmitting={false}
          errorMessage={null}
          onAnswerChange={() => {}}
          onSubmit={() => {}}
          onSkip={() => {}}
          onExit={() => {}}
          onRetry={() => {}}
        />
      )

      expect(html).toContain('Rewrite the sentence in negative form.')
      expect(html).toContain('assessment-text-input')
      expect(html).toContain('value="They do not play"')
      expect(html).toContain('輸入完成後可按 Enter 或點擊下方確認送出')
    })

    it('renders reading question with passage content', () => {
      const readingItem: assessmentLib.AssessmentClientItem = {
        id: 'r_main_01',
        responseType: 'single_choice',
        prompt: 'What is the main topic of this passage?',
        choices: [
          { id: 'A', text: 'School life' },
          { id: 'B', text: 'Space travel' },
        ],
        passage: {
          id: 'pass_01',
          title: 'The Great Journey',
          content: 'Long ago, pioneers traveled across the ocean.',
        },
      }

      const html = renderToStaticMarkup(
        <AssessmentQuestionView
          sessionState={baseSessionState}
          currentItem={readingItem}
          rawAnswer=""
          isSubmitting={false}
          errorMessage={null}
          onAnswerChange={() => {}}
          onSubmit={() => {}}
          onSkip={() => {}}
          onExit={() => {}}
          onRetry={() => {}}
        />
      )

      expect(html).toContain('The Great Journey')
      expect(html).toContain('Long ago, pioneers traveled across the ocean.')
      expect(html).toContain('What is the main topic of this passage?')
    })

    it('renders network error retry banner and preserves learner answer', () => {
      const mcqItem: assessmentLib.AssessmentClientItem = {
        id: 'v_core_01',
        responseType: 'single_choice',
        prompt: 'Vocabulary prompt',
        choices: [{ id: 'A', text: 'choice text' }],
      }

      const html = renderToStaticMarkup(
        <AssessmentQuestionView
          sessionState={baseSessionState}
          currentItem={mcqItem}
          rawAnswer="A"
          isSubmitting={false}
          errorMessage="網路連線逾時，請點擊重試。"
          onAnswerChange={() => {}}
          onSubmit={() => {}}
          onSkip={() => {}}
          onExit={() => {}}
          onRetry={() => {}}
        />
      )

      expect(html).toContain('網路連線逾時，請點擊重試。')
      expect(html).toContain('點擊重試送出')
      expect(html).toContain('is-selected')
    })

    it('locks UI when isSubmitting is true', () => {
      const mcqItem: assessmentLib.AssessmentClientItem = {
        id: 'v_core_01',
        responseType: 'single_choice',
        prompt: 'Prompt',
        choices: [{ id: 'A', text: 'choice' }],
      }

      const html = renderToStaticMarkup(
        <AssessmentQuestionView
          sessionState={baseSessionState}
          currentItem={mcqItem}
          rawAnswer="A"
          isSubmitting={true}
          errorMessage={null}
          onAnswerChange={() => {}}
          onSubmit={() => {}}
          onSkip={() => {}}
          onExit={() => {}}
          onRetry={() => {}}
        />
      )

      expect(html).toContain('送出中…')
      expect(html).toContain('disabled=""')
    })
  })

  describe('AssessmentResultView', () => {
    const mockResult: assessmentLib.SanitizedAssessmentResult = {
      sessionId: 's1111111-1111-1111-1111-111111111111',
      childId: 'c1111111-1111-1111-1111-111111111111',
      completedAt: '2026-09-12T00:00:00Z',
      totalItems: 18,
      overallNarrativeZh: '整體掌握穩固，閱讀與文法表現良好。',
      domainSummaries: {
        vocabulary: {
          domain: 'vocabulary',
          result: 'secure',
          confidence: 'high',
          summaryZh: '詞彙量豐富且能靈活運用',
        },
        grammar: {
          domain: 'grammar',
          result: 'developing',
          confidence: 'medium',
          summaryZh: '句型結構與文法規則掌握良好',
        },
        reading: {
          domain: 'reading',
          result: 'needs_support',
          confidence: 'low',
          summaryZh: '需提升閱讀理解與關鍵訊息掌握度',
        },
      },
      skillEvaluations: {
        core_vocabulary: { skill: 'core_vocabulary', domain: 'vocabulary', result: 'secure', confidence: 'high' },
        contextual_meaning: { skill: 'contextual_meaning', domain: 'vocabulary', result: 'secure', confidence: 'high' },
        word_form_usage: { skill: 'word_form_usage', domain: 'vocabulary', result: 'secure', confidence: 'medium' },
        basic_sentence_structure: { skill: 'basic_sentence_structure', domain: 'grammar', result: 'secure', confidence: 'high' },
        verb_tense_agreement: { skill: 'verb_tense_agreement', domain: 'grammar', result: 'developing', confidence: 'medium' },
        questions_and_negatives: { skill: 'questions_and_negatives', domain: 'grammar', result: 'developing', confidence: 'low' },
        modifiers_and_relations: { skill: 'modifiers_and_relations', domain: 'grammar', result: 'developing', confidence: 'medium' },
        complex_structures: { skill: 'complex_structures', domain: 'grammar', result: 'developing', confidence: 'low' },
        explicit_information: { skill: 'explicit_information', domain: 'reading', result: 'developing', confidence: 'medium' },
        main_idea: { skill: 'main_idea', domain: 'reading', result: 'developing', confidence: 'medium' },
        vocabulary_in_context: { skill: 'vocabulary_in_context', domain: 'reading', result: 'developing', confidence: 'low' },
        inference: { skill: 'inference', domain: 'reading', result: 'needs_support', confidence: 'low' },
        information_integration: { skill: 'information_integration', domain: 'reading', result: 'needs_support', confidence: 'low' },
      },
    }

    it('renders result with overall summary, 3 domains, 13 skills, and completion notice', () => {
      const html = renderToStaticMarkup(
        <AssessmentResultView result={mockResult} onExit={() => {}} />
      )

      // Header & Overall
      expect(html).toContain('診斷結果已完成')
      expect(html).toContain('共完成 18 題')
      expect(html).toContain('整體掌握穩固，閱讀與文法表現良好。')

      // 3 Domains
      expect(html).toContain('單字')
      expect(html).toContain('詞彙量豐富且能靈活運用')
      expect(html).toContain('文法')
      expect(html).toContain('句型結構與文法規則掌握良好')
      expect(html).toContain('閱讀')
      expect(html).toContain('需提升閱讀理解與關鍵訊息掌握度')

      // Badges
      expect(html).toContain('掌握穩定')
      expect(html).toContain('正在建立')
      expect(html).toContain('需要加強')

      // Low confidence tag
      expect(html).toContain('目前資料較少')

      // 13 coarse skills in Traditional Chinese
      expect(html).toContain('核心單字')
      expect(html).toContain('情境字義')
      expect(html).toContain('詞性與用法')
      expect(html).toContain('基本句型')
      expect(html).toContain('時態與主詞動詞一致')
      expect(html).toContain('問句與否定')
      expect(html).toContain('修飾語與關係表達')
      expect(html).toContain('複合句型')
      expect(html).toContain('明確資訊擷取')
      expect(html).toContain('主旨理解')
      expect(html).toContain('上下文字義')
      expect(html).toContain('推論理解')
      expect(html).toContain('資訊整合')

      // Truthful next steps note
      expect(html).toContain('診斷結果已完成。後續個人化整合將由系統的學習檔案處理。')
      expect(html).toContain('這次結果已更新孩子目前的程度診斷。')
      expect(html).toContain('回到孩子學習頁')

      // Strict Security & Privacy Assertions: Internal enum IDs, difficulty numbers, and engine version MUST NOT be rendered
      expect(html).not.toContain('core_vocabulary')
      expect(html).not.toContain('verb_tense_agreement')
      expect(html).not.toContain('information_integration')
      expect(html).not.toContain('estimatedDifficulty')
      expect(html).not.toContain('engine_version')
      expect(html).not.toContain('v1.0.0')
      expect(html).not.toContain('broad_probe')
      expect(html).not.toContain('targeted_confirmation')

      // Strictly NO fake improvement percentage or score delta
      expect(html).not.toContain('進步')
      expect(html).not.toContain('%')
      expect(html).not.toContain('+')
    })

    it('renders retake-eligible options when 90+ days have passed', () => {
      const eligibleOverview: assessmentLib.AssessmentOverview = {
        childId: '11111111-1111-1111-1111-111111111111',
        status: 'completed',
        sessionId: '22222222-2222-2222-2222-222222222222',
        itemsCompleted: 18,
        targetItemCount: 18,
        completedAt: '2026-06-01T00:00:00Z',
        retakeEligible: true,
        daysSinceCompleted: 95,
        cooldownDays: 90,
      }

      const html = renderToStaticMarkup(
        <AssessmentResultView
          result={mockResult}
          overview={eligibleOverview}
          onExit={() => {}}
          onRetake={() => {}}
        />
      )

      expect(html).toContain('重新診斷')
      expect(html).toContain('上次診斷已超過 90 天')
      expect(html).toContain('回到孩子學習頁')
    })

    it('renders cooldown notice when retake attempted during active cooldown', () => {
      const html = renderToStaticMarkup(
        <AssessmentResultView
          result={mockResult}
          cooldownNotice="距離上次診斷尚未滿 90 天，目前暫不開放重新診斷。系統會持續依據每週學習表現動態微調。"
          onExit={() => {}}
        />
      )

      expect(html).toContain('距離上次診斷尚未滿 90 天，目前暫不開放重新診斷')
    })
  })
})
