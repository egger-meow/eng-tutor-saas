import type {
  EvidenceMode,
  ExtractedExam,
  ExtractedPassage,
  ExtractedQuestion,
  RequiredAssetRole,
} from '../schemas/extracted.ts';

function asset(examId: string, page: number, role: RequiredAssetRole, description: string) {
  return {
    page,
    role,
    imagePath: `history_exams/assets/${examId}/page-${page}.png`,
    description,
  };
}

function question(exam: ExtractedExam, number: number): ExtractedQuestion {
  const item = exam.questions.find((q) => q.questionNumber === number);
  if (!item) throw new Error(`${exam.examId} Q${number}: source-fidelity override target missing`);
  return item;
}

function passage(exam: ExtractedExam, id: string): ExtractedPassage {
  const item = exam.passages.find((p) => p.id === id);
  if (!item) throw new Error(`${exam.examId} ${id}: source-fidelity override target missing`);
  return item;
}

function markQuestion(
  exam: ExtractedExam,
  number: number,
  mode: EvidenceMode,
  role: RequiredAssetRole,
  description: string,
) {
  const item = question(exam, number);
  item.evidenceMode = mode;
  item.visualEvidenceRequired = true;
  item.requiredAssets = [asset(exam.examId, item.page, role, description)];
  item.extractionConfidence = 'needs_multimodal_review';
  if (!item.extractionWarnings.includes('Verified official-source visual evidence is required.')) {
    item.extractionWarnings.push('Verified official-source visual evidence is required.');
  }
}

function markPassage(
  exam: ExtractedExam,
  id: string,
  mode: EvidenceMode,
  role: RequiredAssetRole,
  description: string,
) {
  const item = passage(exam, id);
  item.evidenceMode = mode;
  item.visualEvidenceRequired = true;
  item.requiredAssets = [asset(exam.examId, item.pageStart, role, description)];
}

function apply111(exam: ExtractedExam) {
  const q21 = question(exam, 21);
  q21.stem = q21.stem.replace(/\s+th\s*$/i, '').trim();
  q21.options.C = 'Their 20th year of business.';

  const p2324 = passage(exam, '111-p23-24');
  // The PDF text layer drops the infographic body. Preserve the task-relevant source
  // fact verified during multimodal review rather than leaving a generic placeholder.
  p2324.text = 'Visual infographic comparing drinks and their sugar content, including rice milk.';

  markQuestion(exam, 32, 'text_visual', 'infographic', 'Figure-based evidence for Q32');
  markQuestion(exam, 39, 'spatial', 'map', 'Southend Trail map required for Q39');
  markQuestion(exam, 41, 'text_visual', 'table', 'Anagram examples required for Q41');
}

function apply112(exam: ExtractedExam) {
  const p2425 = passage(exam, '112-p24-25');
  p2425.genre = 'infographic_chart_table';
  p2425.text = [
    "Four Seasons' Kitchen",
    'Garden Sandwich $80; Autumn Wind $60; Winter Snow $70.',
    'Star plan: 15 stars can be used for a $60 drink for free.',
    'Opening hours: 2:00-8:00 pm Tuesday through Sunday; closed Mondays and the second Sunday of each month.',
    'The same page includes Amy’s August calendar for the scheduling question.',
  ].join('\n');
  markPassage(exam, '112-p24-25', 'text_visual', 'table', "Four Seasons' Kitchen menu, reward rules, and calendar");

  const p2627 = passage(exam, '112-p26-27');
  p2627.genre = 'infographic_chart_table';
  p2627.text = [
    'Baby-bird care decision guide.',
    'HURT: call the animal center or carefully take the bird to an animal hospital; keep it warm and do not give it any food.',
    'NOT HURT + HAS FEATHERS: Just leave it there.',
    "NOT HURT + FEW FEATHERS: put it back if the nest can be reached; otherwise call the animal center.",
    "Myth correction: Birds don't care about human smell on a baby bird.",
  ].join('\n');
  markPassage(exam, '112-p26-27', 'text_visual', 'infographic', 'Conditional baby-bird care infographic');

  const p2829 = passage(exam, '112-p28-29');
  p2829.genre = 'infographic_chart_table';
  p2829.text = 'Food-waste infographic/chart showing stage-by-stage quantities and percentages, including the displayed value 4.6.';
  markPassage(exam, '112-p28-29', 'text_visual', 'infographic', 'Food-waste process chart and quantitative labels');

  for (const n of [24, 25]) markQuestion(exam, n, 'text_visual', 'table', "Four Seasons' Kitchen visual task");
  for (const n of [26, 27]) markQuestion(exam, n, 'text_visual', 'infographic', 'Baby-bird care decision infographic');
  for (const n of [28, 29]) markQuestion(exam, n, 'text_visual', 'infographic', 'Food-waste chart');
}

function apply113(exam: ExtractedExam) {
  const p2425 = passage(exam, '113-p24-25');
  p2425.genre = 'infographic_chart_table';
  p2425.text = "Baker's Kitchen visual schedule/menu used to answer Q24-Q25.";
  markPassage(exam, '113-p24-25', 'text_visual', 'table', "Baker's Kitchen visual schedule");

  const p2627 = passage(exam, '113-p26-27');
  p2627.genre = 'brochure_flyer';
  p2627.text = 'Green Festival visitor information and map, including entrances, parking, roads, and transport recommendations.';
  markPassage(exam, '113-p26-27', 'spatial', 'map', 'Green Festival map and visitor information');

  const q26 = question(exam, 26);
  q26.stem = 'What is recommended to people who want to visit the festival?';
  const q28 = question(exam, 28);
  q28.options.B = 'They don’t like to share.';

  for (const n of [24, 25]) markQuestion(exam, n, 'text_visual', 'table', "Baker's Kitchen visual schedule");
  for (const n of [26, 27]) markQuestion(exam, n, 'spatial', 'map', 'Green Festival map');
  markQuestion(exam, 28, 'text_visual', 'full_page', 'Paired illustrated anecdotes for Q28');

  const p4043 = passage(exam, '113-p40-43');
  p4043.evidenceMode = 'text_visual';
  p4043.visualEvidenceRequired = true;
  p4043.requiredAssets = [asset('113', p4043.pageStart, 'infographic', '1918 pandemic city comparison graphs')];
  markQuestion(exam, 41, 'text_visual', 'infographic', '1918 pandemic city comparison graph');
  markQuestion(exam, 42, 'text_visual', 'infographic', '1918 pandemic city comparison graph');
}

function apply114(exam: ExtractedExam) {
  const q23 = question(exam, 23);
  q23.options.C = "Jeff tells everyone he'll move abroad when Ivy is still telling them about her baby.";
  question(exam, 27).stem = 'What do we learn from the first paragraph?';

  const p2931 = passage(exam, '114-p29-31');
  p2931.genre = 'comic_strip';
  markPassage(exam, '114-p29-31', 'text_visual', 'comic', 'Multi-panel environmental-history comic');
  for (const n of [29, 30, 31]) markQuestion(exam, n, 'text_visual', 'comic', 'Multi-panel environmental-history comic');

  const p3537 = passage(exam, '114-p35-37');
  p3537.evidenceMode = 'text_visual';
  p3537.visualEvidenceRequired = true;
  p3537.requiredAssets = [asset('114', p3537.pageStart, 'full_page', 'Historical electricity-worker image and article context')];
  markQuestion(exam, 36, 'text_visual', 'full_page', 'Historical electricity-worker image required for Q36');
}

function apply115(exam: ExtractedExam) {
  const fruit = passage(exam, '115-p20-21');
  fruit.text = [
    'The Best Fruit Tea You Can Make at Home',
    'Things to get ready: 3-4 teabags (green or black tea), half an apple, half a peach, half a pear, 20 mL lemon juice, 1,200 mL water, 30 g sugar.',
    'Note: Most fruits are good for making fruit tea, but not papayas or bananas.',
    'How to make fruit tea: boil water; steep the teabags for 2-3 minutes and remove them; cut fruit into small pieces; put the fruit into the hot tea for 5-6 minutes; add sugar and lemon juice and stir for at least 10 seconds.',
    'Now enjoy the tea!',
  ].join('\n');

  const hawkins = passage(exam, '115-p22-23');
  hawkins.text = hawkins.text.replace(/^\s*th\s*\n?/i, '').trim();

  // Q30 is solvable from article text. It was previously over-classified as spatial.
  const q30 = question(exam, 30);
  q30.evidenceMode = 'text_only';
  q30.visualEvidenceRequired = false;
  q30.requiredAssets = [];
  q30.extractionConfidence = 'high';
  q30.extractionWarnings = q30.extractionWarnings.filter((warning) => !/visual|spatial/i.test(warning));
}

/**
 * Deterministic corrections verified against the official CAP PDFs during the 215-item
 * multimodal digestion. These overrides repair PDF text-layer loss or modality mistakes;
 * they never change published answer keys.
 */
export function applySourceFidelityOverrides(exam: ExtractedExam): ExtractedExam {
  switch (exam.examId) {
    case '111':
      apply111(exam);
      break;
    case '112':
      apply112(exam);
      break;
    case '113':
      apply113(exam);
      break;
    case '114':
      apply114(exam);
      break;
    case '115':
      apply115(exam);
      break;
  }
  return exam;
}
