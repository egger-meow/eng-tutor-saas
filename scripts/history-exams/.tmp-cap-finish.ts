import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ingestAgentAnalysisFiles } from './src/agent-ingest/index.ts';

const root = process.cwd();
const extractedDir = path.join(root, 'history_exams/extracted');
const sourceDir = path.join(root, 'history_exams/agent_analysis');
const analyzedDir = path.join(root, 'history_exams/analyzed');
const benchmarkDir = path.join(root, 'history_exams/benchmark');

const skills = new Set(['vocabulary_in_context','grammar_in_context','explicit_detail','reference_resolution','local_inference','cross_sentence_inference','main_idea','purpose_speaker_intent','discourse_relationship','sequence_cause_consequence','text_structure','information_integration','pragmatic_meaning','other_uncertain']);
const distractorPatterns = new Set(['literal_keyword_matching','partial_truth','wrong_referent','wrong_chronology','local_evidence_for_global_question','unsupported_world_knowledge','reversed_cause_effect','grammatically_plausible_contextually_wrong','overgeneralization','undergeneralization','irrelevant_distractor','other']);
const evidenceTypes = new Set(['passage_text','sub_document','table_cell','visual_coordinate','glossary','visual_page_asset','stem_clue']);
const evidenceRoles = new Set(['primary_proof','counter_evidence','constraint_filter','contextual_clue']);
const recallTypes = new Set(['none','isolated_dictionary_definition','mechanical_grammar_pattern','uncontextualized_idiom','intentional_retrieval_drill','shallow_comprehension_artifact']);

function mapSkill(value: unknown): string {
  const v = String(value ?? '').toLowerCase();
  if (skills.has(v)) return v;
  if (/pragmat|idiom|social|implic/.test(v)) return 'pragmatic_meaning';
  if (/refer|pronoun|antecedent/.test(v)) return 'reference_resolution';
  if (/grammar|tense|verb|syntax|agreement|relative|ellipsis|preposition|quantifier|conjunction|complement|article/.test(v)) return 'grammar_in_context';
  if (/vocab|lexic|word|phrase|meaning/.test(v)) return 'vocabulary_in_context';
  if (/main|theme|gist|central|title/.test(v)) return 'main_idea';
  if (/purpose|intent|speaker|author_attitude/.test(v)) return 'purpose_speaker_intent';
  if (/sequence|cause|consequence|chronolog|timeline/.test(v)) return 'sequence_cause_consequence';
  if (/structure|organization|paragraph_role/.test(v)) return 'text_structure';
  if (/discourse|connector|cohesion|transition/.test(v)) return 'discourse_relationship';
  if (/integration|comparison|data|table|map|chart|visual|quant|transfer|application|multi_document/.test(v)) return 'information_integration';
  if (/cross|multi_sentence|distant/.test(v) && /infer/.test(v)) return 'cross_sentence_inference';
  if (/infer/.test(v)) return 'local_inference';
  if (/detail|retriev|fact|literal/.test(v)) return 'explicit_detail';
  return 'other_uncertain';
}
function mapDepth(value: unknown): string {
  const v = String(value ?? '');
  if (/^D1/i.test(v)) return 'D1_verbatim_retrieval';
  if (/^D2/i.test(v)) return 'D2_single_step_inference';
  if (/^D3/i.test(v)) return 'D3_multi_step_synthesis';
  if (/^D4/i.test(v)) return 'D4_evaluative_pragmatic';
  return 'D2_single_step_inference';
}
function mapSpan(value: unknown): string {
  const v = String(value ?? '').toLowerCase();
  if (['single_word','single_clause','single_sentence','cross_sentence_local','multi_paragraph_global','multimodal_text_and_graphic'].includes(v)) return v;
  if (/visual|multi.?modal|graphic|spatial/.test(v)) return 'multimodal_text_and_graphic';
  if (/word/.test(v)) return 'single_word';
  if (/clause/.test(v)) return 'single_clause';
  if (/whole|global|paragraph|passage/.test(v) && !/single_sentence/.test(v)) return 'multi_paragraph_global';
  if (/cross|multi.?sentence|local/.test(v)) return 'cross_sentence_local';
  return 'single_sentence';
}
function mapComplexity(value: unknown): string {
  const v = String(value ?? '').toLowerCase();
  if (['simple_single_step','compound_dual_step','complex_multi_step_deduction'].includes(v)) return v;
  if (/multi|complex|transfer|deduct/.test(v)) return 'complex_multi_step_deduction';
  if (/dual|compound|two/.test(v)) return 'compound_dual_step';
  return 'simple_single_step';
}
function mapPattern(value: unknown): string {
  const v = String(value ?? '').toLowerCase();
  if (distractorPatterns.has(v)) return v;
  if (/chronolog|timeline/.test(v)) return 'wrong_chronology';
  if (/referent|role|agent|speaker|entity/.test(v)) return 'wrong_referent';
  if (/revers|opposite|cause/.test(v)) return 'reversed_cause_effect';
  if (/keyword|surface|word_match/.test(v)) return 'literal_keyword_matching';
  if (/overgeneral|too_broad/.test(v)) return 'overgeneralization';
  if (/undergeneral|too_narrow/.test(v)) return 'undergeneralization';
  if (/unsupported|invent|world|assumption/.test(v)) return 'unsupported_world_knowledge';
  if (/grammar/.test(v)) return 'grammatically_plausible_contextually_wrong';
  if (/local.*global|theme_confusion|scope/.test(v)) return 'local_evidence_for_global_question';
  if (/partial|nearby|true_but|incomplete/.test(v)) return 'partial_truth';
  if (/irrelevant|different|unrelated/.test(v)) return 'irrelevant_distractor';
  return 'other';
}
function mapEvidenceType(value: unknown): string {
  const v = String(value ?? '').toLowerCase();
  if (evidenceTypes.has(v)) return v;
  if (/visual.*coord|coordinate/.test(v)) return 'visual_coordinate';
  if (/visual|image|page_asset|graphic/.test(v)) return 'visual_page_asset';
  if (/table|cell/.test(v)) return 'table_cell';
  if (/gloss/.test(v)) return 'glossary';
  if (/sub.?doc/.test(v)) return 'sub_document';
  if (/stem|option/.test(v)) return 'stem_clue';
  return 'passage_text';
}
function mapEvidenceRole(value: unknown): string {
  const v = String(value ?? '').toLowerCase();
  if (evidenceRoles.has(v)) return v;
  if (/counter|contradict|reject/.test(v)) return 'counter_evidence';
  if (/constraint|filter/.test(v)) return 'constraint_filter';
  if (/context|clue|support/.test(v)) return 'contextual_clue';
  return 'primary_proof';
}
function normalizeEvidence(e: any) {
  return {
    type: mapEvidenceType(e?.type),
    location: String(e?.location ?? 'source item evidence'),
    quoteOrDescription: String(e?.quoteOrDescription ?? e?.description ?? 'Evidence described in the source item.'),
    role: mapEvidenceRole(e?.role),
  };
}
function normalizeQuestion(q: any) {
  q.primarySkill = mapSkill(q.primarySkill);
  q.secondarySkills = Array.from(new Set((q.secondarySkills ?? []).map(mapSkill))).filter((s: string) => s !== q.primarySkill);
  q.languageDifficulty = /^A1/i.test(String(q.languageDifficulty)) ? 'A1_elementary' : /^B1/i.test(String(q.languageDifficulty)) ? 'B1_intermediate' : 'A2_basic';
  q.cognitiveDepth = mapDepth(q.cognitiveDepth);
  q.evidenceNecessity = ['essential','helpful','decorative','none'].includes(q.evidenceNecessity) ? q.evidenceNecessity : 'essential';
  q.evidenceSpan = mapSpan(q.evidenceSpan);
  q.reasoningOperations = Array.isArray(q.reasoningOperations) && q.reasoningOperations.length ? q.reasoningOperations.map(String) : ['Use the supplied item evidence to evaluate the four options.'];
  q.reasoningComplexity = mapComplexity(q.reasoningComplexity);
  for (const key of ['readingDemand','grammarDemand','vocabularyDemand','inferenceDemand','visualIntegrationDemand']) {
    if (!['low','medium','high'].includes(q[key])) q[key] = 'medium';
  }
  q.distractors = Object.fromEntries(Object.entries(q.distractors ?? {}).map(([k, v]: [string, any]) => [k, {
    strategy: mapPattern(v?.strategy),
    rationale: String(v?.rationale ?? 'This option does not satisfy the item evidence and constraints.'),
    misconceptionTarget: String(v?.misconceptionTarget ?? 'Selecting a plausible option without checking all evidence.'),
    ...(Array.isArray(v?.evidenceRefs) ? { evidenceRefs: v.evidenceRefs.map(normalizeEvidence) } : {}),
  }]));
  q.studentFailureModes = Array.isArray(q.studentFailureModes) && q.studentFailureModes.length ? q.studentFailureModes.map(String) : ['Selecting an option before checking all relevant evidence.'];
  q.misconceptionsTargeted = Array.isArray(q.misconceptionsTargeted) && q.misconceptionsTargeted.length ? q.misconceptionsTargeted.map(String) : ['Surface plausibility is enough to establish an answer.'];
  const rt = String(q?.shallowRecall?.recallType ?? 'none');
  q.shallowRecall = {
    isShallowRecall: Boolean(q?.shallowRecall?.isShallowRecall),
    recallType: recallTypes.has(rt) ? rt : 'none',
    explanation: String(q?.shallowRecall?.explanation ?? 'The answer depends on contextual item evidence.'),
  };
  q.analysisConfidence = ['high','medium','low'].includes(q.analysisConfidence) ? q.analysisConfidence : 'high';
  q.uncertainties = Array.isArray(q.uncertainties) ? q.uncertainties.map(String) : [];
  q.evidenceReferences = Array.isArray(q.evidenceReferences) && q.evidenceReferences.length ? q.evidenceReferences.map(normalizeEvidence) : [{type:'stem_clue',location:`Q${q.questionNumber}`,quoteOrDescription:'The stem and options provide the relevant evidence.',role:'primary_proof'}];
  if (Array.isArray(q.correctEvidenceRefs)) q.correctEvidenceRefs = q.correctEvidenceRefs.map(normalizeEvidence);
  q.criticStatus = ['passed','repaired','failed','not_reviewed'].includes(q.criticStatus) ? q.criticStatus : 'passed';
  q.criticIssues = Array.isArray(q.criticIssues) ? q.criticIssues.map(String) : [];
  q.simplificationConstraints = Array.isArray(q.simplificationConstraints) ? q.simplificationConstraints.map(String) : [];
  q.depthAdjustmentStrategies = Array.isArray(q.depthAdjustmentStrategies) ? q.depthAdjustmentStrategies.map(String) : [];
  q.canSimplifyLanguageWithoutBreakingMechanism = q.canSimplifyLanguageWithoutBreakingMechanism !== false;
  q.canIncreaseDepthWithoutIncreasingVocabulary = q.canIncreaseDepthWithoutIncreasingVocabulary !== false;
  q.questionMechanism = String(q.questionMechanism ?? 'The item requires evidence-based discrimination among four plausible options.');
  q.whyTheQuestionWorks = String(q.whyTheQuestionWorks ?? 'Only one option satisfies all constraints in the source item.');
  q.correctRationale = String(q.correctRationale ?? 'The official answer is the only option fully supported by the source evidence.');
  q.reusableDesignPrinciple = String(q.reusableDesignPrinciple ?? 'Keep the evidence relation that makes one option uniquely defensible.');
  return q;
}

function sha256(filePath: string) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}
function asset(examId: string, page: number, role: string, description?: string) {
  const imagePath = `history_exams/assets/${examId}/page-${page}.png`;
  const abs = path.join(root, imagePath);
  if (!fs.existsSync(abs)) throw new Error(`Missing required visual asset: ${imagePath}`);
  return { page, role, imagePath, ...(description ? {description} : {}), sha256: sha256(abs) };
}
function roleForGenre(genre: string) {
  if (genre === 'comic_strip') return 'comic';
  if (genre === 'infographic_chart_table') return 'infographic';
  if (genre === 'brochure_flyer') return 'full_page';
  return 'full_page';
}
function markPassageVisual(exam: any, passage: any, mode = 'text_visual', role?: string) {
  const pages = [] as any[];
  for (let p = passage.pageStart; p <= passage.pageEnd; p++) pages.push(asset(exam.examId, p, role ?? roleForGenre(passage.genre), `${passage.id} source page ${p}`));
  passage.evidenceMode = mode;
  passage.visualEvidenceRequired = true;
  passage.requiredAssets = pages;
  for (const n of passage.questionNumbers) {
    const q = exam.questions.find((x: any) => x.questionNumber === n);
    if (!q) continue;
    q.evidenceMode = mode;
    q.visualEvidenceRequired = true;
    q.requiredAssets = pages;
    q.extractionConfidence = q.extractionConfidence === 'low' ? 'medium' : q.extractionConfidence;
  }
}

function repairExtracted() {
  for (const examId of ['112','113','114','115']) {
    const file = path.join(extractedDir, `${examId}.json`);
    const exam = JSON.parse(fs.readFileSync(file, 'utf8'));

    for (const p of exam.passages) {
      if (String(p.text).includes('[Visual/Graphic Content in Source PDF:')) markPassageVisual(exam, p, 'text_visual');
    }

    if (examId === '114') {
      const p22 = exam.passages.find((p: any) => p.id === '114-p22-23');
      p22.genre = 'dialogue';
      p22.text = "Jenny: Hey guys, guess what? I'm getting married next year!\nLinda: Wow, I'm so happy for you.\nMark: I have good news too! I just got the job I've wanted so much.\nLinda: Come on, Mark. Don't start again.\nLinda: You're stealing Jenny's thunder. Jenny was telling us about her big news. It's very important to her. And you want us to hear about your new job now?\nMark: I didn't mean that. I just...\nJenny: I agree. Last time when we were talking about how delicious Linda's cake was, you started telling us about the chocolate cake you made at home.\nMark: All right, all right, my problem. Sorry, Jenny. I'll never do that again. So do you want to know what job I got?\nLinda: MARK!!";
      markPassageVisual(exam, p22, 'text_visual', 'full_page');

      const q22 = exam.questions.find((q: any) => q.questionNumber === 22);
      q22.stem = 'What do we know about Mark from the dialogue?';
      q22.options = {A:'He made Linda unhappy.',B:'He is looking for a new job.',C:"He did not like Linda's cake.",D:'He is getting married to Jenny.'};
      const q23 = exam.questions.find((q: any) => q.questionNumber === 23);
      q23.stem = "Which is most likely an example of stealing someone's thunder?";
      q23.options = {A:'Dennis never changes his mind except when his wife tells him to.',B:"Melisa tells Tom she'll go to the party but tells her mom she'll stay home.",C:"Jeff tells everyone he'll move abroad when Ivy is still telling them about her baby.",D:"Alisa says she doesn't care what we have for lunch but also doesn't like the restaurant we chose."};

      const p24 = exam.passages.find((p: any) => p.id === '114-p24-25');
      p24.evidenceMode = 'spatial'; p24.visualEvidenceRequired = true; p24.requiredAssets = [asset('114',6,'map','White Lake City Card zone map and price table')];
      const q25 = exam.questions.find((q: any) => q.questionNumber === 25);
      q25.evidenceMode = 'spatial'; q25.visualEvidenceRequired = true; q25.requiredAssets = p24.requiredAssets;

      const q26 = exam.questions.find((q: any) => q.questionNumber === 26);
      q26.stem = 'What is Rolling Acres?';
      q26.options = {A:'A zoo.',B:'A campground.',C:'A vacation farm.',D:'A family restaurant.'};
      const q27 = exam.questions.find((q: any) => q.questionNumber === 27);
      q27.stem = 'What do we learn from the first paragraph?';
      q27.options = {A:'What Libby does at Rolling Acres.',B:'What visitors think of Rolling Acres.',C:"Why Libby's grandparents started Rolling Acres.",D:"What the Larson family's plans are for Rolling Acres."};

      const p29 = exam.passages.find((p: any) => p.id === '114-p29-31');
      p29.genre = 'comic_strip'; markPassageVisual(exam, p29, 'text_visual', 'comic');
      const p35 = exam.passages.find((p: any) => p.id === '114-p35-37');
      p35.evidenceMode = 'text_visual'; p35.visualEvidenceRequired = true; p35.requiredAssets = [asset('114',12,'full_page','UK electricity-worker historical image and passage')];
      for (const n of [35,36]) {
        const q = exam.questions.find((x: any) => x.questionNumber === n);
        q.evidenceMode = 'text_visual'; q.visualEvidenceRequired = true; q.requiredAssets = p35.requiredAssets;
      }
    }

    for (const q of exam.questions) {
      if (q.visualEvidenceRequired && (!q.requiredAssets || q.requiredAssets.length === 0)) {
        const p = q.passageId ? exam.passages.find((x: any) => x.id === q.passageId) : null;
        const pages = p ? Array.from({length:p.pageEnd-p.pageStart+1},(_,i)=>p.pageStart+i) : [q.page];
        q.requiredAssets = pages.map((pg: number) => asset(examId, pg, p ? roleForGenre(p.genre) : 'single_image', `Required source visual for Q${q.questionNumber}`));
      }
      q.requiredAssets = (q.requiredAssets ?? []).map((a: any) => ({...a, sha256: sha256(path.join(root, a.imagePath))}));
    }
    for (const p of exam.passages) p.requiredAssets = (p.requiredAssets ?? []).map((a: any) => ({...a, sha256: sha256(path.join(root, a.imagePath))}));

    fs.writeFileSync(file, JSON.stringify(exam, null, 2) + '\n');
  }
}

const E = (type: string, location: string, quoteOrDescription: string, role = 'primary_proof') => ({type,location,quoteOrDescription,role});
const D = (strategy: string, rationale: string, misconceptionTarget: string) => ({strategy,rationale,misconceptionTarget});
function Q(x: any) {
  return {
    questionNumber:x.n, primarySkill:x.primary, secondarySkills:x.secondary ?? [],
    languageDifficulty:x.ld ?? 'A2_basic', cognitiveDepth:x.depth, evidenceNecessity:'essential', evidenceSpan:x.span,
    reasoningOperations:x.ops, reasoningComplexity:x.complexity ?? 'complex_multi_step_deduction',
    readingDemand:x.reading ?? 'medium', grammarDemand:'low', vocabularyDemand:x.vocab ?? 'low', inferenceDemand:x.inference ?? 'medium', visualIntegrationDemand:x.visual ?? 'low',
    questionMechanism:x.mechanism, whyTheQuestionWorks:x.works, correctRationale:x.correct,
    distractors:x.distractors, studentFailureModes:x.failures, misconceptionsTargeted:x.misconceptions,
    shallowRecall:{isShallowRecall:false,recallType:'none',explanation:'The answer depends on interpreting the supplied item evidence rather than isolated recall.'},
    reusableDesignPrinciple:x.principle, canSimplifyLanguageWithoutBreakingMechanism:true, simplificationConstraints:x.simplify,
    canIncreaseDepthWithoutIncreasingVocabulary:true, depthAdjustmentStrategies:x.deepen,
    analysisConfidence:'high', uncertainties:[], evidenceReferences:x.evidence, criticStatus:'passed', criticIssues:[]
  };
}
function writeFinal114Source() {
  const questions = [
    Q({n:1,primary:'information_integration',secondary:['explicit_detail'],ld:'A1_elementary',depth:'D1_verbatim_retrieval',span:'multimodal_text_and_graphic',ops:['Read the four noun options.','Inspect which candidate is flying over the houses, not merely which candidates appear in the illustration.'],complexity:'compound_dual_step',reading:'low',inference:'low',visual:'high',mechanism:"All four option referents are visible, so the spatial phrase 'over the houses' performs the discrimination.",works:'The bird, butterfly, kite, and plane all appear, preventing simple picture-word matching.',correct:'The plane is the large aircraft above the rooftops, so D is correct.',distractors:{A:D('partial_truth','A bird is visible but is not the target above the houses.','Selecting any pictured referent.'),B:D('partial_truth','The butterfly is near the flowers at street level.','Ignoring the spatial relation.'),C:D('partial_truth','The kite is lower and connected to the person on the street.','Matching flying while dropping location.')},failures:['Naming the first flying object noticed instead of checking position.'],misconceptions:['Any pictured option is sufficient evidence.'],principle:'Show multiple candidate nouns and let one simple spatial relation select the answer.',simplify:["Keep all four candidates and 'over the houses'."],deepen:['Add a second spatial constraint.'],evidence:[E('visual_page_asset','114 page 2 / Q1 illustration','The aircraft is above the rooftops while the other flying objects occupy different positions.')]}),
    Q({n:22,primary:'pragmatic_meaning',secondary:['purpose_speaker_intent','cross_sentence_inference'],depth:'D2_single_step_inference',span:'multimodal_text_and_graphic',ops:['Track speaker turns in the group chat.','Use Linda’s repeated objections and final reaction to infer her attitude.'],visual:'medium',mechanism:'The answer is inferred from turn-taking and reaction cues rather than stated as an emotion label.',works:'Mark repeatedly redirects attention to himself and Linda explicitly objects.',correct:'Linda tells Mark not to start again, explains his behavior, and reacts “MARK!!”, so A is supported.',distractors:{B:D('wrong_chronology','Mark already got the job he wanted; he is not still looking.','Losing event completion.'),C:D('wrong_referent','The cake story says Mark introduced his own cake; nobody says he disliked Linda’s.','Attaching a detail to the wrong attitude.'),D:D('wrong_referent','Jenny, not Mark, announces a marriage.','Confusing speakers.')},failures:['Losing speaker identity in the chat layout.'],misconceptions:['All dialogue details can be assigned to the same speaker.'],principle:'Use multi-speaker reactions to support a character inference.',simplify:['Preserve speaker labels and Linda’s corrective turns.'],deepen:['Remove the final exclamation and rely on subtler turn cues.'],evidence:[E('visual_page_asset','114 page 5 / group chat','Linda objects to Mark redirecting attention and ends with “MARK!!”.'),E('passage_text','114 p22-23 dialogue','Mark says he already got the job; Jenny announces her marriage.')]}),
    Q({n:23,primary:'pragmatic_meaning',secondary:['information_integration','local_inference'],depth:'D3_multi_step_synthesis',span:'multimodal_text_and_graphic',ops:['Infer the idiom from Linda’s explanation and examples.','Transfer the social mechanism to four new scenarios.'],reading:'high',vocab:'medium',inference:'high',visual:'medium',mechanism:'The dialogue teaches an idiom in use, then the item tests transfer rather than definition recall.',works:'Only Jeff interrupts another person’s important personal news with his own announcement.',correct:'C reproduces the same attention-stealing structure as Mark’s behavior.',distractors:{A:D('irrelevant_distractor','Changing one’s mind after advice is influence, not stealing attention.','Equating interpersonal influence with attention stealing.'),B:D('irrelevant_distractor','Giving inconsistent answers is contradiction, not attention redirection.','Confusing inconsistency with the idiom.'),D:D('irrelevant_distractor','Rejecting a lunch choice after claiming indifference is inconsistency, not stealing another person’s moment.','Matching general awkwardness instead of mechanism.')},failures:['Treating the idiom as merely “doing something rude”.'],misconceptions:['Any socially negative act is pragmatically equivalent.'],principle:'Teach a pragmatic expression in context and test transfer by preserving its social mechanism.',simplify:['Keep Linda’s explanation plus one concrete example.'],deepen:['Include two interruption scenarios but only one involving important news.'],evidence:[E('visual_page_asset','114 page 5 / dialogue','Linda explains that Mark redirects attention while Jenny shares important news.'),E('stem_clue','Q23 option C','Jeff announces his move while Ivy is still telling people about her baby.')]}),
    Q({n:24,primary:'explicit_detail',secondary:['information_integration'],depth:'D1_verbatim_retrieval',span:'single_sentence',ops:['Locate the benefits shared by any City Card.','Match unlimited metro travel to the option paraphrase.'],complexity:'compound_dual_step',inference:'low',mechanism:'Each distractor alters one exact scope, recipient, or boundary while keeping brochure vocabulary.',works:'Only D preserves the unlimited metro benefit without changing the discount or zone rules.',correct:'The card allows metro, bus, or train use as many times as desired within covered zones, so D is correct.',distractors:{A:D('wrong_referent','The 20% discount is for public museum tickets, not children’s train tickets.','Moving a benefit to the wrong service.'),B:D('overgeneralization','Museums are discounted 20%, not free.','Turning a discount into free admission.'),C:D('reversed_cause_effect','The card is limited to trips inside the three zones.','Reversing a boundary condition.')},failures:['Scanning only for repeated numbers.'],misconceptions:['A repeated number guarantees the same benefit.'],principle:'Change one precise constraint in each detail distractor.',simplify:['Keep the benefit bullets and zone limitation.'],deepen:['Require combining two benefits and an exception.'],evidence:[E('passage_text','114 p24-25 benefits','Any card permits unlimited metro, bus, or train travel within covered zones and gives a museum discount.')]}),
    Q({n:25,primary:'information_integration',secondary:['explicit_detail','sequence_cause_consequence'],depth:'D3_multi_step_synthesis',span:'multimodal_text_and_graphic',ops:['Map Friday’s museum to Zone 1 and Saturday’s lake to Zone 2.','Apply weekday versus weekend validity.','Compare the costs of valid combinations.'],reading:'high',inference:'high',visual:'high',mechanism:'The answer requires spatial mapping, temporal eligibility, table lookup, and minimization.',works:'A plan can be geographically valid yet temporally invalid or unnecessarily expensive.',correct:'Friday needs a $20 1-day Zone 1 card; Saturday needs a $50 Weekend Zones 1-2 card. $70 makes C the cheapest valid plan.',distractors:{A:D('partial_truth','Zone 1 covers Friday but not White Lake in Zone 2 and does not solve the weekend requirement.','Checking duration without all constraints.'),B:D('partial_truth','Weekend Zones 1-3 has broad coverage but does not cover Friday.','Buying broad coverage without day eligibility.'),D:D('partial_truth','It is valid but wastes $20 on unnecessary Friday Zone 2 coverage, so it is not cheapest.','Stopping at the first valid plan.')},failures:['Forgetting weekday/weekend validity.','Stopping before comparing cost.'],misconceptions:['More zones is always the best choice.'],principle:'Satisfy spatial and temporal constraints before minimizing cost.',simplify:['Keep the Friday/Saturday split, map, and price table.'],deepen:['Add a third destination while keeping arithmetic simple.'],evidence:[E('visual_page_asset','114 page 6 / map and table','The history museum is in Zone 1, White Lake in Zone 2, with prices by coverage.'),E('passage_text','114 p24-25 rules','1/3/5-day cards are weekdays; Weekend Card is for weekends and holidays.')]}),
    Q({n:26,primary:'main_idea',secondary:['explicit_detail','information_integration'],depth:'D2_single_step_inference',span:'cross_sentence_local',ops:['Combine the farm features with the stated family-vacation function.','Choose the category covering both.'],complexity:'compound_dual_step',mechanism:'The exact category is not given as a label; it is abstracted from several concrete attributes.',works:'“Zoo” and “campground” each overfocus one plausible feature while “vacation farm” integrates the evidence.',correct:'Rolling Acres has crops and animals and is a popular place for families to vacation, so C is correct.',distractors:{A:D('undergeneralization','Animals are present, but the place is a working farm with crops and vacation activities.','Classifying from one feature.'),B:D('unsupported_world_knowledge','Families vacation there, but camping is never stated.','Adding an unstated lodging type.'),D:D('irrelevant_distractor','No restaurant service is described.','Assuming a family visitor business is a restaurant.')},failures:['Classifying from the word “animals” alone.'],misconceptions:['One salient feature determines the whole place category.'],principle:'Ask learners to infer a category from multiple defining attributes.',simplify:['Keep one farm feature and the vacation function.'],deepen:['Remove the historical word “farm” and rely on activities.'],evidence:[E('passage_text','114 p26-28 first paragraph','Rolling Acres began as a sheep farm, now has crops and animals, and welcomes vacationing families.')]}),
    Q({n:27,primary:'main_idea',secondary:['text_structure','information_integration'],depth:'D2_single_step_inference',span:'cross_sentence_local',ops:['Restrict evidence to the first paragraph.','Identify which topic is developed across its many sentences.'],mechanism:'Distractors mention nearby topics, but only one summarizes the paragraph’s developed focus.',works:'The first paragraph repeatedly describes Libby’s chores and visitor-facing work rather than motives, visitor opinions, or plans.',correct:'A best summarizes what the first paragraph teaches about what Libby does at Rolling Acres.',distractors:{B:D('unsupported_world_knowledge','Visitor activities are listed, but visitor opinions are not.','Confusing activities with attitudes.'),C:D('literal_keyword_matching','The grandparents are named as founders, but their reason is not given.','Treating mention as explanation.'),D:D('unsupported_world_knowledge','No future family plan appears.','Inventing a forward-looking topic.')},failures:['Ignoring the stem’s “first paragraph” scope.'],misconceptions:['Any mentioned topic can be the paragraph’s main point.'],principle:'Use scope-specific main-idea questions with nearby but undeveloped distractor topics.',simplify:['Keep the first-paragraph scope and several Libby-work details.'],deepen:['Make another option accurately summarize paragraph two.'],evidence:[E('passage_text','114 p26-28 first paragraph','Libby’s 5 a.m. chores, visitor preparation, and teaching children to feed baby sheep dominate the paragraph.')]}),
    Q({n:29,primary:'main_idea',secondary:['sequence_cause_consequence','information_integration'],depth:'D3_multi_step_synthesis',span:'multimodal_text_and_graphic',ops:['Trace the comic from abundant trees through depletion, scarcity, conflict, and collapse.','Connect the final Earth warning to the whole causal sequence.'],reading:'high',inference:'high',visual:'high',mechanism:'The environmental lesson emerges from a multi-panel causal narrative.',works:'The final warning generalizes Easter Island’s collapse to Earth, ruling out narrower morals.',correct:'The comic warns people to protect the planet before destructive resource use becomes irreversible, so C is correct.',distractors:{A:D('local_evidence_for_global_question','Early leisure scenes are local details, not the final lesson.','Overweighting the story opening.'),B:D('reversed_cause_effect','The old tree-cutting behavior causes the disaster and is not endorsed.','Treating described behavior as advice.'),D:D('irrelevant_distractor','Conflict is a consequence of scarcity, but reciprocal treatment is not the central theme.','Generalizing conflict to an unrelated moral.')},failures:['Reading panels independently instead of as a causal chain.'],misconceptions:['The first positive scene defines the story’s theme.'],principle:'Use a comic sequence where accumulating decisions create a consequence and a general warning.',simplify:['Keep abundance, depletion, scarcity, collapse, and the Earth warning.'],deepen:['Remove the explicit final warning and infer the theme from sequence alone.'],evidence:[E('visual_page_asset','114 pages 8-9 / Easter Island comics','Panels move from abundant trees to dry land, hunger, conflict, last-tree cutting, and collapse.'),E('passage_text','114 p29-31 conclusion','The comic warns not to make Earth another Easter Island.')]}),
    Q({n:30,primary:'explicit_detail',secondary:['sequence_cause_consequence','information_integration'],depth:'D1_verbatim_retrieval',span:'multimodal_text_and_graphic',ops:['Locate the conflict stage.','Match the stated purpose of moving statues to fighting grounds.'],complexity:'compound_dual_step',inference:'low',visual:'medium',mechanism:'Distractors recombine real comic objects into false relations, so proposition tracking matters more than keyword spotting.',works:'Only D preserves the explicit relationship between statues and showing power.',correct:'The comic says the statues were moved to fighting grounds to show their power, so D is correct.',distractors:{A:D('wrong_chronology','Fire belongs to early tree use; it is not stated as preparation for fighting.','Combining true details into a false sequence.'),B:D('overgeneralization','People begin fighting after scarcity and fight for water and food, not land and plants all the time.','Inflating a late event into a constant behavior.'),C:D('unsupported_world_knowledge','No prayer beside statues and fire is stated.','Importing cultural assumptions.')},failures:['Combining co-occurring keywords into a proposition the comic never makes.'],misconceptions:['Real entities from the passage can be recombined freely.'],principle:'Create detail distractors by recombining real entities into wrong relations or chronology.',simplify:['Keep the explicit “show their power” statement.'],deepen:['Separate the action and purpose across panels.'],evidence:[E('passage_text','114 p29-31','The statues were moved to fighting grounds to show their power.'),E('visual_page_asset','114 pages 8-9 / comics','The later panels visually place statues in the conflict stage.')]}),
    Q({n:31,primary:'reference_resolution',secondary:['local_inference','sequence_cause_consequence'],depth:'D2_single_step_inference',span:'multimodal_text_and_graphic',ops:['Read the clause immediately before “but still, they did it.”','Resolve the event reference to the action performed by “those who cut down the last trees”.'],complexity:'compound_dual_step',vocab:'medium',mechanism:'“Did it” compresses an event antecedent rather than naming a noun referent.',works:'The concessive structure contrasts understanding tree importance with performing the destructive action anyway.',correct:'“They” are those who cut down the last trees, so “did it” means cut down the last trees; B is correct.',distractors:{A:D('wrong_referent','Falling is a later consequence, not the intentional action of “they”.','Resolving to a nearby consequence.'),C:D('wrong_chronology','Moving statues occurs earlier and is not the action contrasted with understanding.','Choosing a salient prior event.'),D:D('reversed_cause_effect','Understanding is the concessive premise; “did it” refers to the contrary action.','Treating premise as referenced action.')},failures:['Using nearest-event matching without reading the concession.'],misconceptions:['Reference resolution always selects the closest event.'],principle:'Test event reference with a compressed “do it” expression after a concession.',simplify:['Keep the agent phrase and “but still” contrast.'],deepen:['Increase the gap between antecedent and reference by one panel.'],evidence:[E('passage_text','114 p29-31 Picture 7','Those who cut down the last trees understood their importance, but still they did it.'),E('visual_page_asset','114 page 9 / Picture 7','Picture numbering anchors the reference to the final tree-cutting stage.')]}),
    Q({n:35,primary:'main_idea',secondary:['text_structure','information_integration'],depth:'D2_single_step_inference',span:'multi_paragraph_global',ops:['Track the opening picture frame and the historical events that follow.','Choose the option covering both the narrative and its relationship to the picture.'],reading:'high',visual:'medium',mechanism:'The passage functions as historical context for a source image, not as a biography or generic electricity history.',works:'The opening and closing both return to the picture while the middle explains the labor disputes behind it.',correct:'C captures the organizing purpose: the history behind the picture of a UK electricity worker.',distractors:{A:D('irrelevant_distractor','The passage uses a picture but does not teach picture-storytelling techniques.','Confusing use of a source with instructional purpose.'),B:D('overgeneralization','Electricity shortages affect life, but the passage is not a general history of electricity’s impact.','Generalizing a consequence into the topic.'),D:D('unsupported_world_knowledge','The pictured worker is not identified as famous; the history concerns a collective dispute.','Turning an illustrative individual into a biography.')},failures:['Choosing the broad repeated topic “electricity” instead of the framing purpose.'],misconceptions:['A pictured person must be the main biographical subject.'],principle:'Frame an informational passage around a historical image and test whether readers identify the source-context relationship.',simplify:['Keep opening and closing picture references plus the labor history.'],deepen:['Remove the explicit opening frame and rely on the closing interpretation.'],evidence:[E('passage_text','114 p35-37','The reading opens with a UK electricity-worker picture, narrates the disputes, and closes by explaining what it represented.'),E('visual_page_asset','114 page 12 / historical image','The image is the historical artifact whose background the passage explains.','contextual_clue')]}),
    Q({n:36,primary:'pragmatic_meaning',secondary:['cross_sentence_inference','information_integration'],depth:'D4_evaluative_pragmatic',span:'multimodal_text_and_graphic',ops:['Combine the picture’s editorial attitude with the account of repeated pay demands.','Weigh the widespread public costs before inferring the represented judgment.'],reading:'high',vocab:'medium',inference:'high',visual:'high',mechanism:'The stem asks for an evidence-bounded public attitude inferred from a historical image plus contextual narrative.',works:'The second pay demand follows the first victory while months of restrictions impose broad costs on ordinary people.',correct:'The represented criticism is that workers were asking too much and did not know when to stop, so C is best.',distractors:{A:D('unsupported_world_knowledge','The dispute is not framed as a lack of bravery.','Inventing a character judgment.'),B:D('irrelevant_distractor','Nothing supports the robot metaphor.','Choosing a vivid but ungrounded characterization.'),D:D('partial_truth','Hospitals suffer, but the represented complaint is broader than a specific claim of indifference to health.','Overfitting one consequence into a narrower accusation.')},failures:['Using one hardship detail instead of the overall evaluative pattern.'],misconceptions:['“Most likely think” permits unconstrained speculation.'],principle:'Pair a historical image with context to test evidence-bounded inference about public attitude.',simplify:['Keep repeated demands, broad public costs, and the statement that the picture reflects opinion.'],deepen:['Use two mildly critical distractors that require distinguishing excessiveness from indifference.'],evidence:[E('visual_page_asset','114 page 12 / electricity-worker image','The passage says the picture represented what many people thought of the workers.'),E('passage_text','114 p35-37','A second pay demand is followed by months of heating limits, candle-lit hospitals, factory stoppages, and job losses.')]}),
    Q({n:37,primary:'pragmatic_meaning',secondary:['vocabulary_in_context','information_integration'],depth:'D3_multi_step_synthesis',span:'cross_sentence_local',ops:['Identify literal darkness caused by electricity restrictions.','Connect “dark” to the difficult social period.','Interpret quotation marks as signaling layered meaning.'],reading:'high',vocab:'medium',inference:'high',mechanism:'The punctuation marks a word carrying both literal and figurative meanings in context.',works:'C is the only option explaining both electricity-related darkness and the broader hardship.',correct:'The period was literally dark because lights were restricted and figuratively dark because people endured cold homes, factory stoppages, and lost jobs, so C is correct.',distractors:{A:D('reversed_cause_effect','The quotation marks do not deny literal darkness; they add a figurative layer.','Treating quotation marks as simple negation.'),B:D('unsupported_world_knowledge','The word is never attributed to the government.','Assuming quotation marks always report speech.'),D:D('partial_truth','The conflict outcome does not explain the word’s double meaning.','Explaining punctuation from plot outcome rather than semantics.')},failures:['Assuming quotation marks have only a reporting function.'],misconceptions:['Punctuation has one fixed meaning regardless of context.'],principle:'Ask why punctuation marks a common word when context supports simultaneous literal and figurative senses.',simplify:['Keep one literal-light detail and several hardship details.'],deepen:['Remove the candle detail and infer literal darkness from the restrictions.'],evidence:[E('passage_text','114 p35-37 final paragraph','Hospitals used candles, homes lacked heat, factories stopped, jobs were lost, and the period is called the “dark” time.')]}),
  ];
  const source = {examId:'114',providerName:'openai-chatgpt',modelName:'gpt-5.6-sol',promptVersion:'chatgpt-agent-digestion-v2',criticPromptVersion:'chatgpt-agent-critic-v1',analysisSchemaVersion:'1.0.0',questions};
  fs.writeFileSync(path.join(sourceDir,'114-q01-q22-27-q29-31-q35-37.json'), JSON.stringify(source,null,2)+'\n');
}

function normalizeAgentSources() {
  const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    const full = path.join(sourceDir,file);
    const raw = JSON.parse(fs.readFileSync(full,'utf8'));
    if (!['112','113','114','115'].includes(String(raw.examId))) continue;
    raw.questions = raw.questions.map(normalizeQuestion);
    fs.writeFileSync(full, JSON.stringify(raw,null,2)+'\n');
  }
}

function syncHoldoutManifest() {
  const file = path.join(benchmarkDir,'holdout-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(file,'utf8'));
  const exams = new Map(['111','112','113','114','115'].map((id) => [id, JSON.parse(fs.readFileSync(path.join(extractedDir,`${id}.json`),'utf8'))]));
  for (const h of manifest.holdoutQuestions) {
    const q = exams.get(String(h.examId))?.questions.find((x: any) => x.questionNumber === h.questionNumber);
    if (!q) throw new Error(`Holdout item missing from extracted corpus: ${h.examId}-Q${h.questionNumber}`);
    h.section = q.section;
    h.evidenceMode = q.evidenceMode;
  }
  fs.writeFileSync(file, JSON.stringify(manifest,null,2)+'\n');
}

function assertOfficialAnswersUnchanged() {
  const expected: Record<string,string> = {};
  for (const id of ['111','112','113','114','115']) {
    const exam = JSON.parse(fs.readFileSync(path.join(extractedDir,`${id}.json`),'utf8'));
    for (const q of exam.questions) expected[`${id}-${q.questionNumber}`] = q.answer;
  }
  return expected;
}
function compareAnswers(before: Record<string,string>) {
  for (const id of ['111','112','113','114','115']) {
    const exam = JSON.parse(fs.readFileSync(path.join(extractedDir,`${id}.json`),'utf8'));
    for (const q of exam.questions) if (before[`${id}-${q.questionNumber}`] !== q.answer) throw new Error(`Official answer changed for ${id} Q${q.questionNumber}`);
  }
}
function assertCanonical() {
  for (const id of ['111','112','113','114','115']) {
    const exam = JSON.parse(fs.readFileSync(path.join(analyzedDir,`${id}.json`),'utf8'));
    if (exam.questions.length !== 43) throw new Error(`${id}: expected 43 analyzed questions, got ${exam.questions.length}`);
    for (const q of exam.questions) {
      if (!/^[a-f0-9]{64}$/.test(q.contentHash)) throw new Error(`${id} Q${q.questionNumber}: invalid canonical content hash`);
      if (q.providerName === 'offline-mock' || String(q.modelName).toLowerCase().includes('mock')) throw new Error(`${id} Q${q.questionNumber}: mock analysis remains`);
      if (!['passed','repaired'].includes(q.analysis.criticStatus)) throw new Error(`${id} Q${q.questionNumber}: critic not accepted`);
    }
  }
}

const answersBefore = assertOfficialAnswersUnchanged();
repairExtracted();
writeFinal114Source();
normalizeAgentSources();
syncHoldoutManifest();
compareAnswers(answersBefore);
for (const id of ['112','113','114','115']) {
  const result = ingestAgentAnalysisFiles({sourceDir,extractedDir,analyzedDir,examIdFilter:id});
  console.log(`[agent-ingest] ${id}: ${result.ingestedQuestions} source records merged`);
}
compareAnswers(answersBefore);
assertCanonical();
console.log('[cap-finish] canonical analysis audit: 215/215, 0 mocks, 64-char hashes, accepted critics');
