import { describe, expect, it } from 'vitest'
import {
  CurriculumPackageSchema,
  QuestionV25Schema,
  countActiveResponseSlots,
  computeQuestionDuration,
  validateCurriculumPackage,
} from './index.js'

describe('Curriculum Response Contracts (Schema 2.5.0)', () => {
  describe('QuestionV25Schema response layouts', () => {
    it('accepts organizer table with ResponseGridCell objects and responseUnitId', () => {
      const parsed = QuestionV25Schema.safeParse({
        id: 'q-table-1',
        targetIds: ['target-1'],
        itemType: 'short-response',
        prompt: 'Fill in the table with clues from the reading.',
        writingLines: 0,
        difficulty: 'on-level',
        responseLayout: {
          type: 'organizer',
          headers: ['Location', 'Clue Source', 'Inferred Meaning'],
          rows: [
            {
              label: 'Paragraph 1',
              cells: [
                { text: 'The door was locked from inside' },
                { responseUnitId: 'q-table-1.slot1', placeholder: 'What does this show?' },
              ],
            },
          ],
        },
      })
      expect(parsed.success).toBe(true)
    })

    it('accepts sequence layout with horizontal/vertical layoutDirection and step items', () => {
      const parsed = QuestionV25Schema.safeParse({
        id: 'q-seq-1',
        targetIds: ['target-1'],
        itemType: 'short-response',
        prompt: 'Order the chronological events.',
        writingLines: 0,
        difficulty: 'on-level',
        responseLayout: {
          type: 'sequence',
          layoutDirection: 'horizontal',
          items: [
            { stepNumber: 1, label: 'Initiation', content: 'Mina started the robot test' },
            { stepNumber: 2, label: 'Observation', responseUnitId: 'q-seq-1.slot1', placeholder: 'What error happened?' },
            { stepNumber: 3, label: 'Adjustment', content: 'She shaded the lens' },
          ],
        },
      })
      expect(parsed.success).toBe(true)
    })
  })

  describe('Workload fit calculation with active response slots', () => {
    it('counts only real student slots and excludes static prompt cells', () => {
      const tableQuestion = {
        itemType: 'short-response',
        responseLayout: {
          type: 'table',
          headers: ['Col 1', 'Col 2', 'Col 3'],
          rows: [
            {
              cells: [
                { text: 'Given prompt 1' },
                { responseUnitId: 'u1', placeholder: 'Answer 1' },
                { responseUnitId: 'u2', placeholder: 'Answer 2' },
              ],
            },
            {
              cells: [
                { text: 'Given prompt 2' },
                { responseUnitId: 'u3', placeholder: 'Answer 3' },
                { text: 'Static note' },
              ],
            },
          ],
        },
      }

      expect(countActiveResponseSlots(tableQuestion)).toBe(3)
      // Sentence demand: 2.0 base + 3 * 1.5 = 6.5 minutes
      expect(computeQuestionDuration(tableQuestion)).toBe(6.5)

      // Token demand: 1.5 base + 3 * 0.75 = 3.75 minutes
      const tokenTableQuestion = { ...tableQuestion, itemType: 'vocabulary' }
      expect(computeQuestionDuration(tokenTableQuestion)).toBe(3.75)
    })

    it('excludes demonstration/worked example rows and items from active slots', () => {
      const questionWithExample = {
        itemType: 'short-response',
        responseLayout: {
          type: 'table',
          headers: ['Feature', 'Value'],
          rows: [
            { label: 'Example: String Thickness', cells: [{ responseUnitId: 'ex1' }] },
            { label: 'Actual String Tension', cells: [{ responseUnitId: 'u1' }] },
          ],
        },
      }
      // ex1 is in an Example row, so only u1 is counted!
      expect(countActiveResponseSlots(questionWithExample)).toBe(1)
    })

    it('counts sequence items declaring responseUnitId with demand calibration', () => {
      const seqQuestion = {
        itemType: 'sequence',
        responseLayout: {
          type: 'sequence',
          layoutDirection: 'vertical',
          items: [
            { stepNumber: 'Example', content: 'Given worked example' },
            { stepNumber: 1, content: 'Given step' },
            { stepNumber: 2, responseUnitId: 's1', placeholder: 'Action step' },
            { stepNumber: 3, responseUnitId: 's2', placeholder: 'Result step' },
          ],
        },
      }

      expect(countActiveResponseSlots(seqQuestion)).toBe(2)
      // Token/sequence demand: 1.5 base + 2 * 0.75 = 3.0 minutes
      expect(computeQuestionDuration(seqQuestion)).toBe(3.0)
    })
  })

  describe('responseUnitRelationshipIssues validation', () => {
    function makeBasePackage(): any {
      return {
        metadata: { schemaVersion: '2.5.0' },
        learningPlan: { targets: [{ id: 't1' }] },
        studentLesson: {
          practice: [
            {
              stage: 'guided',
              questions: [],
            },
          ],
          homework: {
            questions: [],
          },
        },
        answers: [],
      }
    }

    it('rejects accidental answer exposure when response slot contains student-facing text', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q1',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'organizer',
          headers: ['Clue', 'Answer'],
          rows: [
            {
              cells: [
                { text: 'Given Clue' },
                { responseUnitId: 'Q1.slot1', text: 'LEAKED ANSWER TEXT' },
              ],
            },
          ],
        },
      })
      pkg.answers.push({
        questionId: 'Q1',
        answer: 'Model Answer',
        unitAnswers: [{ unitId: 'Q1.slot1', answer: 'LEAKED ANSWER TEXT' }],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Accidental answer exposure: response slot "Q1.slot1" contains student-facing text'))).toBe(true)
    })

    it('rejects accidental answer exposure when sequence slot contains student-facing content', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q2',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'sequence',
          layoutDirection: 'horizontal',
          items: [
            { stepNumber: 1, content: 'First step' },
            { stepNumber: 2, responseUnitId: 'Q2.slot1', content: 'LEAKED SEQUENCE CONTENT' },
          ],
        },
      })
      pkg.answers.push({
        questionId: 'Q2',
        answer: 'Model Answer',
        unitAnswers: [{ unitId: 'Q2.slot1', answer: 'LEAKED SEQUENCE CONTENT' }],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Accidental answer exposure: sequence response slot "Q2.slot1" contains student-facing content'))).toBe(true)
    })

    it('rejects missing unitAnswers in answer key for declared response slots', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q3',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'organizer',
          headers: ['Col 1', 'Col 2'],
          rows: [
            {
              cells: [
                { responseUnitId: 'Q3.slot1', placeholder: 'Fill 1' },
                { responseUnitId: 'Q3.slot2', placeholder: 'Fill 2' },
              ],
            },
          ],
        },
      })
      // Only provides Q3.slot1, missing Q3.slot2
      pkg.answers.push({
        questionId: 'Q3',
        answer: 'Model Answer',
        unitAnswers: [{ unitId: 'Q3.slot1', answer: 'Answer 1' }],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Missing unitAnswer for response unit "Q3.slot2" in question "Q3"'))).toBe(true)
    })

    it('rejects orphan unitAnswers that do not match any declared slot in the question', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q4',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'organizer',
          headers: ['Col 1', 'Col 2'],
          rows: [
            {
              cells: [
                { responseUnitId: 'Q4.slot1', placeholder: 'Fill 1' },
              ],
            },
          ],
        },
      })
      pkg.answers.push({
        questionId: 'Q4',
        answer: 'Model Answer',
        unitAnswers: [
          { unitId: 'Q4.slot1', answer: 'Answer 1' },
          { unitId: 'Q4.orphan', answer: 'Ghost answer' },
        ],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Orphan unitAnswer "Q4.orphan" does not match any declared response unit in question "Q4"'))).toBe(true)
    })

    it('rejects duplicate responseUnitId in question', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q5',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'organizer',
          headers: ['Col 1', 'Col 2'],
          rows: [
            {
              cells: [
                { responseUnitId: 'dup.slot', placeholder: 'Slot 1' },
                { responseUnitId: 'dup.slot', placeholder: 'Slot 2' },
              ],
            },
          ],
        },
      })
      pkg.answers.push({
        questionId: 'Q5',
        answer: 'Model Answer',
        unitAnswers: [{ unitId: 'dup.slot', answer: 'Answer' }],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Duplicate responseUnitId "dup.slot" in question "Q5"'))).toBe(true)
    })

    it('passes when slots use placeholders and answer key provides matching unitAnswers', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q6',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'organizer',
          headers: ['Col 1', 'Col 2'],
          rows: [
            {
              cells: [
                { text: 'Given premise' },
                { responseUnitId: 'Q6.slot1', placeholder: 'Deduce conclusion' },
              ],
            },
          ],
        },
      })
      pkg.answers.push({
        questionId: 'Q6',
        answer: 'Model Answer',
        unitAnswers: [{ unitId: 'Q6.slot1', answer: 'Deduce conclusion answer', explanationZh: '見第二段' }],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues).toEqual([])
    })

    it('rejects row defining both values and cells simultaneously', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q7',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'organizer',
          headers: ['Col 1', 'Col 2'],
          rows: [
            {
              values: ['Legacy value 1', 'Legacy value 2'],
              cells: [{ text: 'Cell 1' }, { text: 'Cell 2' }],
            },
          ],
        },
      })
      pkg.answers.push({ questionId: 'Q7', answer: 'Answer' })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Row cannot define both values and cells simultaneously'))).toBe(true)
    })

    it('rejects synthetic two-header row with label + two cells (column count mismatch)', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q8',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'organizer',
          headers: ['Header 1', 'Header 2'], // 2 headers
          rows: [
            {
              label: 'Row Label', // 1 label
              cells: [{ text: 'Cell 1' }, { text: 'Cell 2' }], // + 2 cells = 3 cols!
            },
          ],
        },
      })
      pkg.answers.push({ questionId: 'Q8', answer: 'Answer' })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Row column count (3) does not match header count (2)'))).toBe(true)
    })

    it('rejects duplicate conflicting unitAnswers in answer key (duplicate u1)', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q9',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'sequence',
          layoutDirection: 'vertical',
          items: [
            { stepNumber: 1, responseUnitId: 'u1' },
            { stepNumber: 2, responseUnitId: 'u2' },
          ],
        },
      })
      pkg.answers.push({
        questionId: 'Q9',
        answer: 'Overall Answer',
        unitAnswers: [
          { unitId: 'u1', answer: 'A' },
          { unitId: 'u1', answer: 'B' }, // duplicate u1!
          { unitId: 'u2', answer: 'C' },
        ],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Duplicate unitAnswer for unit "u1" in question "Q9"'))).toBe(true)
    })

    it('rejects orphan unitAnswers on questions with no declared units', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q10',
        itemType: 'short-response',
        writingLines: 2, // regular question with writingLines, no responseLayout units
      })
      pkg.answers.push({
        questionId: 'Q10',
        answer: 'Overall Answer',
        unitAnswers: [{ unitId: 'orphan.unit', answer: 'Orphan Answer' }],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Orphan unitAnswer "orphan.unit" does not match any declared response unit'))).toBe(true)
    })

    it('rejects missing unitAnswers when question declares response units', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q11',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'sequence',
          layoutDirection: 'vertical',
          items: [
            { stepNumber: 1, responseUnitId: 's1' },
          ],
        },
      })
      pkg.answers.push({
        questionId: 'Q11',
        answer: 'Overall Answer',
        // missing unitAnswers completely!
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Question "Q11" has 1 response unit(s) (s1) but missing unitAnswers'))).toBe(true)
    })

    it('executes a complete canonical 2.5 package through validateCurriculumPackageForFinisher preserving guitar example', async () => {
      const { validPackage } = await import('./fixtures/canonical-package-fixture.js')
      const { upgradeV20ToV21 } = await import('./upgrade-v20-to-v21.js')
      const { upgradeV21ToV22 } = await import('./upgrade-v21-to-v22.js')
      const { makeGroundedCurriculumPackage } = await import('./fixtures/grounded-curriculum-packages.js')
      const { upgradeV23ToV24, upgradeV24ToV25 } = await import('./curriculum-package-schema.js')
      const { validateCurriculumPackageForFinisher } = await import('./finisher-validate-curriculum-package.js')

      const v20 = validPackage()
      const v21 = upgradeV20ToV21(v20 as any)
      const v22 = upgradeV21ToV22(v21)
      const v23 = makeGroundedCurriculumPackage(v22, 'technology')
      const v24 = upgradeV23ToV24(v23)
      const v25 = upgradeV24ToV25(v24)

      // Replace question I1 with the guitar string organizer table (writingLines: 0)
      const guitarQuestion = v25.studentLesson.practice.find((s) => s.stage === 'independent')?.questions[0]
      expect(guitarQuestion).toBeDefined()
      if (guitarQuestion) {
        guitarQuestion.itemType = 'short-response'
        guitarQuestion.writingLines = 0
        guitarQuestion.prompt = 'Complete the table below to compare the three guitar string variables.'
        guitarQuestion.responseLayout = {
          type: 'organizer',
          headers: ['Feature', 'What changes?', 'What stays the same?', 'Pitch result'],
          rows: [
            {
              label: 'String Thickness',
              cells: [
                { responseUnitId: `${guitarQuestion.id}.thickness.changes`, placeholder: 'thickness' },
                { text: 'tension and length' },
                { responseUnitId: `${guitarQuestion.id}.thickness.pitch`, placeholder: 'lower pitch' },
              ],
            },
            {
              label: 'String Tension',
              cells: [
                { responseUnitId: `${guitarQuestion.id}.tension.changes`, placeholder: 'tension' },
                { text: 'thickness and length' },
                { responseUnitId: `${guitarQuestion.id}.tension.pitch`, placeholder: 'higher pitch' },
              ],
            },
          ],
        }

        // Add corresponding unit answers
        const ans = v25.answers.find((a) => a.questionId === guitarQuestion.id)
        expect(ans).toBeDefined()
        if (ans) {
          ans.unitAnswers = [
            { unitId: `${guitarQuestion.id}.thickness.changes`, answer: 'thicker string', acceptedAnswers: ['thickness increases'] },
            { unitId: `${guitarQuestion.id}.thickness.pitch`, answer: 'lower pitch', acceptedAnswers: ['pitch goes down'] },
            { unitId: `${guitarQuestion.id}.tension.changes`, answer: 'tighter string', acceptedAnswers: ['tension increases'] },
            { unitId: `${guitarQuestion.id}.tension.pitch`, answer: 'higher pitch', acceptedAnswers: ['pitch goes up'] },
          ]
        }
      }

      // Execute through actual Finisher validator!
      const validation = validateCurriculumPackageForFinisher(v25)
      expect(validation.success).toBe(true)
      if (!validation.success) {
        console.error('Finisher validation failed:', validation.issues)
      }
    })
  })
})
