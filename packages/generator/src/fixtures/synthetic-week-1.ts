import { parseWeeklyLesson } from '../validate-lesson.js'

export const syntheticWeekOne = parseWeeklyLesson({
  metadata: {
    jobId: 'synthetic-week-1', childId: 'synthetic-child', weekNumber: 1, grade: 7,
    title: 'The Rooftop Garden Challenge', generatedAt: '2026-08-12T00:00:00.000Z',
    ruleVersion: 'weekly-material/1.0.0',
  },
  personalization: {
    interests: ['science', 'hands-on projects'],
    focusAreas: ['main ideas', 'present simple questions'],
    priorFeedbackSummary: 'Calibration week: no prior family feedback is available.',
    rationale: 'The science-project theme supports the learner’s interests while Week 1 checks reading detail and present-simple control.',
  },
  objectives: [
    'Find the main idea and supporting details in a short project story.',
    'Use context to understand core vocabulary.',
    'Form present-simple questions with do and does.',
    'Write short answers using evidence from a reading.',
  ],
  vocabulary: [
    { word: 'rooftop', partOfSpeech: 'noun', definition: 'the outside surface on top of a building', example: 'Our school has a small garden on its rooftop.' },
    { word: 'project', partOfSpeech: 'noun', definition: 'a planned piece of work', example: 'Mina starts a science project with her class.' },
    { word: 'measure', partOfSpeech: 'verb', definition: 'to find the size or amount of something', example: 'The students measure each plant every Friday.' },
    { word: 'record', partOfSpeech: 'verb', definition: 'to write information so it can be used later', example: 'They record the plant height in a notebook.' },
    { word: 'shade', partOfSpeech: 'noun', definition: 'an area protected from direct sunlight', example: 'One plant grows better in the shade.' },
    { word: 'notice', partOfSpeech: 'verb', definition: 'to see or become aware of something', example: 'Mina notices that one leaf is yellow.' },
    { word: 'compare', partOfSpeech: 'verb', definition: 'to examine how things are similar or different', example: 'The team compares plants in sun and shade.' },
    { word: 'result', partOfSpeech: 'noun', definition: 'what happens because of an action or test', example: 'Their result shows that both water and light matter.' },
  ],
  reading: {
    title: 'Two Places, One Question',
    passage: `Mina's class starts a rooftop garden project. The students want to learn whether sunlight changes how quickly bean plants grow. They place four plants in a sunny area and four in the shade. Every plant gets the same amount of water.\n\nEach Friday, the students measure the plants and record the results. After two weeks, Mina notices that the sunny plants are taller, but two have dry leaves. The plants in the shade are shorter and greener. Her team compares the notes. They decide that sunlight helps the plants grow, but too much heat can hurt them.\n\nThe class does not call one group "good" and the other "bad." Instead, they ask a new question: How can they give every plant enough light without making it too hot? Their first result becomes the start of their next project.`,
  },
  grammar: {
    topic: 'Present simple questions: do and does',
    explanation: 'Use do with I, you, we, and they. Use does with he, she, it, or one singular noun. After do or does, use the base verb: Does Mina record the result? Not "Does Mina records."',
    examples: ['Do the students measure the plants every Friday?', 'Does sunlight change plant growth?', 'Where do they place the plants?', 'Why does Mina compare the notes?'],
  },
  exercises: [
    {
      title: 'Reading Check', instructions: 'Read the passage again. Choose or write the best answer.',
      questions: [
        { questionId: 'R1', prompt: 'What is the main purpose of the class project?', type: 'multiple-choice', options: ['To grow food for lunch', 'To study how sunlight changes plant growth', 'To build a new classroom', 'To compare two notebooks'], writingLines: 1 },
        { questionId: 'R2', prompt: 'What stays the same for all eight plants?', type: 'short-answer', writingLines: 2 },
        { questionId: 'R3', prompt: 'What can you infer from the dry leaves on two sunny plants?', type: 'short-answer', writingLines: 3 },
        { questionId: 'R4', prompt: 'In paragraph 2, what does compare mean?', type: 'multiple-choice', options: ['To examine similarities and differences', 'To water something slowly', 'To move into the shade', 'To make a quick guess'], writingLines: 1 },
      ],
    },
    {
      title: 'Grammar Practice', instructions: 'Use do or does and the base verb. Write a complete question when asked.',
      questions: [
        { questionId: 'G1', prompt: 'Choose the correct sentence.', type: 'multiple-choice', options: ['Does Mina records the result?', 'Does Mina record the result?', 'Do Mina record the result?', 'Mina does record the result?'], writingLines: 1 },
        { questionId: 'G2', prompt: 'Turn this sentence into a question: The students measure the plants every Friday.', type: 'sentence-writing', writingLines: 3 },
        { questionId: 'G3', prompt: 'Write a present-simple question asking where Mina records the results.', type: 'sentence-writing', writingLines: 3 },
        { questionId: 'G4', prompt: 'Correct the error: Does the plants need more shade?', type: 'sentence-writing', writingLines: 2 },
      ],
    },
  ],
  homework: {
    instructions: 'Complete this two or three days after the lesson without looking at the earlier pages first.',
    tasks: [
      { questionId: 'H1', prompt: 'Write the meanings of measure, notice, compare, and result from memory; then check your work.', writingLines: 4 },
      { questionId: 'H2', prompt: 'Write two do questions and two does questions about a school project.', writingLines: 6 },
      { questionId: 'H3', prompt: 'In three sentences, explain the garden result and the class’s next question.', writingLines: 5 },
    ],
  },
  answers: [
    { questionId: 'R1', answer: 'B. To study how sunlight changes plant growth.', explanation: 'The first paragraph states the question the class wants to study.' },
    { questionId: 'R2', answer: 'Every plant gets the same amount of water.', explanation: 'Keeping water the same helps the class focus on sunlight.' },
    { questionId: 'R3', answer: 'The sunny area may give the plants too much heat.', explanation: 'The plants are taller, but the dry leaves suggest that stronger sun also creates a problem.' },
    { questionId: 'R4', answer: 'A. To examine similarities and differences.', explanation: 'The team looks at both groups’ notes to see how the plants differ.' },
    { questionId: 'G1', answer: 'B. Does Mina record the result?', explanation: 'Mina is singular, so use does followed by the base verb record.' },
    { questionId: 'G2', answer: 'Do the students measure the plants every Friday?', explanation: 'Students is plural, so the question begins with do.' },
    { questionId: 'G3', answer: 'Where does Mina record the results?', explanation: 'Mina is singular, so use does and the base verb record.' },
    { questionId: 'G4', answer: 'Do the plants need more shade?', explanation: 'Plants is plural, so use do, not does.' },
    { questionId: 'H1', answer: 'measure: find an amount; notice: become aware; compare: examine similarities and differences; result: what happens after an action or test', explanation: 'Accept equivalent meanings that match the lesson vocabulary.' },
    { questionId: 'H2', answer: 'Answers vary. Example: Do the students record the results? Does Mina measure the plants?', explanation: 'Each question should use do with a plural subject or does with a singular subject, followed by a base verb.' },
    { questionId: 'H3', answer: 'The sunny plants grow taller, but some leaves become dry. The shade plants stay shorter and greener. The class next asks how to give enough light without too much heat.', explanation: 'Accept a clear three-sentence summary containing the result and the next question.' },
  ],
  parentGuidance: {
    weeklyFocus: 'This calibration week checks reading evidence, inference, and do/does questions.',
    supportTips: [
      'Ask the learner to point to a sentence in the passage before checking R1-R3.',
      'If do/does is difficult, cover the answer and ask which subject comes after the question word.',
      'Record whether the reading felt too easy, suitable, or too hard for next week’s adjustment.',
    ],
    completionCheck: 'Confirm that all eight questions and the delayed homework are attempted; note recurring errors without supplying answers first.',
  },
})
