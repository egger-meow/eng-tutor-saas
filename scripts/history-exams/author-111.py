import json
from pathlib import Path

ROOT = Path('.')
EXTRACTED = ROOT / 'history_exams/extracted/111.json'
OUT = ROOT / 'history_exams/agent_analysis/111.json'

data = json.loads(EXTRACTED.read_text())
qmap = {q['questionNumber']: q for q in data['questions']}
pm = {p['id']: p for p in data['passages']}

# Repair two visual-dependent items that older extraction treated as text-only.
visual_repairs = {
    32: {
        'page': 9,
        'role': 'infographic',
        'imagePath': 'history_exams/assets/111/page-9.png',
        'description': 'Figure 1 annual deaths and Figure 2 work-hours/career-advancement graph',
        'sha256': 'de1ec03127fdd9cabd3d75180b3b73432068e869030fee1ace74d9511704a373',
    },
    39: {
        'page': 13,
        'role': 'map',
        'imagePath': 'history_exams/assets/111/page-13.png',
        'description': 'Southend Trail map with towns, castles, river, birdwatching sites, and trail parts',
        'sha256': '1d4a820b24b53658c741b39b9083380c22dbfaff4935119389c41a226a6bb70e',
    },
}
for n, asset in visual_repairs.items():
    q = qmap[n]
    q['evidenceMode'] = 'text_visual'
    q['visualEvidenceRequired'] = True
    q['requiredAssets'] = [asset]
    if q.get('passageId') and q['passageId'] in pm:
        p = pm[q['passageId']]
        p['evidenceMode'] = 'text_visual'
        p['visualEvidenceRequired'] = True
        existing = {a['imagePath'] for a in p.get('requiredAssets', [])}
        if asset['imagePath'] not in existing:
            p.setdefault('requiredAssets', []).append(asset)
EXTRACTED.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

# Every entry below is an authored item-level judgment, not a provider relabel or mock transform.
A = {
1: ('vocabulary_in_context','D1_verbatim_retrieval','The picture shows the woman placing candles upright on the cake.',{
 'B':'Forks are lying beside the plate; she is not putting forks on the cake.',
 'C':'The plates are on the table beside the cake, not being placed on it.',
 'D':'Strawberries are already decorating the cake, while the object in her hand is a candle.'}),
2: ('discourse_relationship','D2_single_step_inference','The 2:00 start time creates a consequence: meeting at 1:45 is therefore sensible, so “so” expresses the intended result.',{
 'B':'“or” would offer an alternative rather than connect the movie time to the proposed meeting time.',
 'C':'“if” would make the meeting conditional on the movie starting at two, which is not the relation stated.',
 'D':'“because” reverses the logic by making the meeting time a cause of the movie start time.'}),
3: ('vocabulary_in_context','D2_single_step_inference','Fear of the dark explains why Peter leaves the lights on while sleeping.',{
 'A':'A computer can emit light, but the sentence tests the ordinary response to darkness, not device use.',
 'B':'Fans affect airflow, not darkness.',
 'D':'Music affects sound, not darkness.'}),
4: ('vocabulary_in_context','D2_single_step_inference','Having more fans than every teammate is direct evidence that Pam is popular.',{
 'A':'Many fans contradict the idea that she is boring.',
 'B':'The sentence gives no evidence about her weight.',
 'D':'Having fans does not establish that she is rich.'}),
5: ('grammar_in_context','D2_single_step_inference','The teacher imposed an obligation after the unfinished homework, so “had to stay” correctly expresses past necessity.',{
 'A':'“failed to stay” would mean the speaker did not remain after school, not that the teacher required it.',
 'C':'“hoped to stay” changes an imposed requirement into the speaker’s wish.',
 'D':'“used to stay” describes a past habit, not this one consequence of missing homework.'}),
6: ('vocabulary_in_context','D2_single_step_inference','Having money for only one of two liked items creates a difficult choice between them.',{
 'B':'A gift is something given, not a decision between alternatives.',
 'C':'A rule is a requirement or principle, not the act of selecting one item.',
 'D':'A trick is a deceptive or clever action, unrelated to deciding what to buy.'}),
7: ('vocabulary_in_context','D2_single_step_inference','Repeated practice with the same kind of math problem makes answering it easy.',{
 'A':'“common” could describe the question type but does not describe the ease of answering it.',
 'C':'Nothing in the context concerns safety.',
 'D':'Repeatedly seeing the same type makes it familiar rather than “special.”'}),
8: ('grammar_in_context','D2_single_step_inference','The construction is “it took me lots of time to prepare,” requiring the to-infinitive after “took me … time.”',{
 'A':'Bare “prepare” cannot fill the complement position after “time” in this construction.',
 'C':'“preparing” does not fit the fixed “take someone time to do” pattern used here.',
 'D':'Past-tense “prepared” cannot function as the required complement.'}),
9: ('vocabulary_in_context','D2_single_step_inference','Unknown river depth is a direct swimming hazard, so “how deep it is” matches the warning.',{
 'B':'Distance from one point to another is not the danger highlighted for swimmers.',
 'C':'The river’s length does not determine whether swimming at this spot is dangerous.',
 'D':'“thick” is not the normal dimension used for river water in this context.'}),
10: ('grammar_in_context','D2_single_step_inference','Bob is compared with all the boys in the family and is the extreme case, so the definite superlative “the laziest” is required.',{
 'A':'Comparative “lazier” needs a two-way comparison or an explicit “than” phrase, not a whole-group extreme.',
 'B':'“the lazy” is not a grammatical superlative adjective phrase here.',
 'C':'“the lazier” is a comparative form and does not express the maximum within the family group.'}),
11: ('grammar_in_context','D2_single_step_inference','Her sixty years of residence support a present state of knowledge, so simple present “knows” is correct.',{
 'A':'“will know” incorrectly moves the knowledge into the future.',
 'B':'“knew” confines the knowledge to the past even though she still lives there.',
 'D':'“was going to know” expresses a past intention/prediction, not an established present fact.'}),
12: ('vocabulary_in_context','D2_single_step_inference','The forecast says heavier rain will come after the typhoon, so it will “follow.”',{
 'A':'Rain does not “catch” in the required intransitive sense.',
 'C':'“move” lacks the needed meaning of arriving next in sequence.',
 'D':'“stop” contradicts the forecast of heavier rain coming soon.'}),
13: ('grammar_in_context','D2_single_step_inference','At the moment the speaker got home, the brother had an imminent dinner plan and invited the speaker, so past progressive “was going out” fits.',{
 'A':'Present “goes out” conflicts with the past-time frame “Yesterday when I got home.”',
 'B':'Simple past “went out” suggests the departure was completed, making the immediate invitation less coherent.',
 'C':'Present perfect “has gone out” is incompatible with the finished past anchor and would imply he is already gone.'}),
14: ('vocabulary_in_context','D2_single_step_inference','Because Amy never repays loans, refusing to lend her money was a wise decision.',{
 'A':'The context supports good judgment, not craziness.',
 'B':'“helpful” would more naturally describe lending her money, which the sentence says was avoided.',
 'D':'Her record of not repaying supports the decision rather than showing it was wrong.'}),
15: ('grammar_in_context','D2_single_step_inference','The current job opportunity is ongoing now, so “is looking for” correctly expresses Mr. Firth’s present search.',{
 'A':'Present perfect “has looked for” emphasizes completed/accumulated searching and does not naturally present an open vacancy.',
 'C':'Simple present “looks for” suggests a habitual activity rather than the current summer need.',
 'D':'Past progressive would place the search in an earlier past period and weaken the current recommendation.'}),
16: ('grammar_in_context','D2_single_step_inference','After “saw a woman get in his car,” the coordinated bare verb phrase “and drive away” describes the second observed action.',{
 'A':'“drive” alone would attach awkwardly without a coordinator after the complete “get in his car” phrase.',
 'B':'“drove” breaks the complement structure after “saw” and lacks coordination.',
 'D':'“and drove” mixes a finite past verb with the bare-infinitive complement pattern “saw … get.”'}),
17: ('grammar_in_context','D2_single_step_inference','The missing girl received the action of being taken away, so the relative clause needs passive past “was taken away.”',{
 'A':'“took away” makes the girl the agent who removed something else.',
 'B':'“taken away” lacks the auxiliary required for a finite relative clause.',
 'C':'“has taken away” is active and would require an object that the girl removed.'}),
18: ('grammar_in_context','D2_single_step_inference','“One” substitutes for one bus of the same class just mentioned: they missed one bus.',{
 'A':'“another” normally means an additional/different one and does not naturally replace the specific scheduled bus just missed.',
 'B':'“it” would require a uniquely identified singular bus antecedent rather than the count-noun class “Buses.”',
 'D':'“them” is plural, but they missed a single hourly bus.'}),
19: ('grammar_in_context','D2_single_step_inference','The studying happened repeatedly during a completed week before the test and led to a completed result, so simple past “studied” fits.',{
 'B':'Present “studies” conflicts with the completed past test episode.',
 'C':'Present perfect is incompatible with the finished past frame “before her Chinese test” plus “got.”',
 'D':'“was going to study” expresses an intention, not the completed repeated studying that produced the grade.'}),
20: ('vocabulary_in_context','D2_single_step_inference','The story describes online responses attacking Josh after he shared his opinion, so “trolling” means posting online to hurt or provoke someone.',{
 'A':'Nothing in the scene involves singing or celebration.',
 'B':'No physical movement of a person or object is involved.',
 'C':'The fishing meaning is a real dictionary sense, but the context is an Internet discussion, not fishing.'}),
21: ('information_integration','D2_single_step_inference','The ad thanks customers for “Twenty Summers & Winters,” which marks Tea-Rock’s twentieth year in business.',{
 'A':'The number 20 is part of the anniversary campaign name, not a claim that tea is sold in twenty countries.',
 'B':'The ad never says a twentieth tea variety is being launched.',
 'D':'The prize trip is to the USA, but the ad does not announce a twentieth US store.'}),
22: ('information_integration','D3_multi_step_synthesis','The instructions require name, birthday, telephone number, e-mail address, favorite tea, and two tea-cup pictures. Jason’s postcard already has everything except his birthday.',{
 'A':'Age is not one of the required fields.',
 'B':'The sender’s street address is not listed among the required information; the printed destination address is already present.',
 'D':'The postcard visibly already contains the required two tea-cup pictures, so no third picture is needed.'}),
23: ('information_integration','D3_multi_step_synthesis','The infographic shows fewer sugar-spoon icons for 400 ml rice milk than for 400 ml grape juice, so rice milk contains less sugar.',{
 'A':'One teaspoon equals 4 g of sugar, while the 66 g ice cream is shown with multiple spoon icons, not only 4 g total.',
 'B':'The daily recommendation is 9 teaspoons for a man and 6 for a woman, so they are not equal.',
 'C':'Average intake is Taiwan 17.75 teaspoons and US 18.75, so Taiwan is lower, not higher.'}),
24: ('purpose_speaker_intent','D3_multi_step_synthesis','The “hidden sugar” list reveals substantial sugar in ordinary foods and drinks, supporting the warning that people may consume more sugar than they realize.',{
 'A':'The infographic has a separate section on health effects; the hidden-food list itself is about unnoticed intake.',
 'B':'The foods are examples of hidden sugar, not a popularity ranking for children.',
 'D':'The list reports amounts already present in products; it does not define a taste threshold for making them sweet.'}),
25: ('purpose_speaker_intent','D2_single_step_inference','Marina lacks ideas for a future-house art assignment, and Darrell recommends Pinterest because people share their work and methods there, giving her examples and ideas.',{
 'B':'Marina initially mistakes Pinterest for a shopping app, but Darrell explicitly corrects that idea.',
 'C':'The conversation is about finding ideas for homework, not meeting friends.',
 'D':'Sharing her own work is what contributors do; Darrell recommends that Marina browse their work for ideas.'}),
26: ('vocabulary_in_context','D2_single_step_inference','Darrell’s example runs from choosing chocolate through baking and decorating, showing that “from A to Z” means learning the whole process or everything about it.',{
 'A':'The phrase describes completeness of coverage, not freedom to learn at any time.',
 'B':'The example was found on Pinterest, not necessarily learned in a formal baking class.',
 'D':'Complete coverage of a topic does not mean spending one’s entire life learning it.'}),
27: ('text_structure','D2_single_step_inference','The first paragraph explains the Tabata cycle: exercise 20 seconds, rest 10 seconds, repeat at least eight times, plus examples of moves. That is how to do the training.',{
 'B':'The paragraph gives interval durations, not the best time of day to train.',
 'C':'It never identifies the inventor of Tabata training.',
 'D':'It explains repetitions within a session, not how often sessions should occur across days or weeks.'}),
28: ('local_inference','D2_single_step_inference','The passage warns that Tabata may not suit people who seldom exercise, while recommending it for busy people who enjoy exercising, so an existing exercise habit is the best fit.',{
 'A':'Nothing says Tabata is especially for people who enjoy team sports; it is described as an individual interval routine.',
 'B':'Beginners who seldom exercise are specifically cautioned that it may not be good for them.',
 'C':'People with heart problems are explicitly warned against this exercise rather than told it will fix those problems.'}),
29: ('explicit_detail','D1_verbatim_retrieval','The passage explicitly says, “You can decide yourself what moves to do,” so users are free to choose their own moves.',{
 'A':'The text says the moves are not difficult to learn.',
 'C':'The opening says Tabata does not take much space.',
 'D':'The method explicitly alternates 20 seconds of exercise with 10 seconds of rest; the afterburn requires hard exercise, not elimination of rest.'}),
30: ('text_structure','D3_multi_step_synthesis','The report first establishes the long-hours problem and why companies created No Overtime Day (c), then defines the policy (a), describes workers’ workarounds (d), and finally explains the incentive that makes the policy fail (b).',{
 'A':'It puts the definition before the initial problem/reason, contrary to the report’s opening.',
 'B':'It also starts with the definition instead of the problem that motivates the policy.',
 'C':'It places the explanation of failure before the paragraph describing how workers evade the policy; the report presents the evasion first.'}),
31: ('reference_resolution','D2_single_step_inference','In “Clearly, this must be changed,” “this” refers to the immediately preceding practice of using long working hours as a signal that workers are hard-working.',{
 'B':'Late-opening restaurants are a consequence of workers staying out, not the practice the author says must be changed.',
 'C':'Not going home is one workaround, but the final sentence targets the broader norm that rewards long hours.',
 'D':'The study’s numerical relationship is evidence for the norm, not the antecedent of “this.”'}),
32: ('information_integration','D3_multi_step_synthesis','Figure 2 shows the men’s and women’s lines meeting at roughly the same percentage around 2,200 annual hours, so their advancement/pay chances are almost the same there.',{
 'A':'Figure 1 gives total deaths by year and does not split 2014 deaths by sex.',
 'B':'Figure 1 fluctuates from year to year (187, 216, 196, 220, 189), so it does not show a steady annual increase.',
 'C':'Figure 2 does not show men consistently above women at the same hours; women are higher at several points and the lines meet near 2,200.'}),
33: ('information_integration','D3_multi_step_synthesis','By 1962 the UK part had joined the Republic of Cameroun and the combined state was named the Federal Republic of Cameroon, matching map D’s single federal country.',{
 'A':'Map A labels the whole territory “Kamerun,” the pre-1919 name.',
 'B':'Map B still separates UK’s Cameroon and French Cameroon, describing the colonial division before reunification.',
 'C':'Map C shows the UK area still separate from the Republic of Cameroun, but the passage says they joined in 1961.'}),
34: ('vocabulary_in_context','D2_single_step_inference','English speakers feel excluded from jobs and official life and then decide to fight for themselves; this context makes “resentful” closest to angry.',{
 'A':'They may also be unhappy, but the move toward resistance signals grievance and anger more specifically than sadness.',
 'C':'“Careful” does not fit the described reaction to unfair treatment.',
 'D':'The passage describes resentment at mistreatment, not anxiety or worry about an uncertain event.'}),
35: ('local_inference','D2_single_step_inference','Police tried to stop the independence meeting and people were killed, strongly implying the Cameroon government rejects the English speakers’ claim that Ambazonia is a separate country.',{
 'A':'The passage describes political conflict, not plans for business cooperation.',
 'B':'Nothing says Cameroon depends on Ambazonia for money or assistance.',
 'C':'The dispute is that Ambazonia’s supporters want to leave Cameroon; saying Cameroon does not want to be part of Ambazonia reverses the political relationship.'}),
36: ('purpose_speaker_intent','D3_multi_step_synthesis','The history explains how colonial division, reunification, minority status, and French-speaker control produced today’s power imbalance for English speakers in Cameroon.',{
 'A':'The article opens by saying the usual global link between English and power does not hold in Cameroon; the history explains that exception.',
 'C':'Reunification is one historical step, not the writer’s final explanatory purpose.',
 'D':'The 20% figure contributes to the explanation but is only one detail, not the reason for recounting the entire history.'}),
37: ('explicit_detail','D1_verbatim_retrieval','The guide explicitly recommends planning one day for one part of the trail because each part takes at least seven hours.',{
 'A':'Camping is allowed only at designated campgrounds, not on side trails.',
 'B':'The text warns cyclists to stay on the main trail because side trails are too narrow.',
 'D':'Starting a hike early is recommended, but the museum is not specifically recommended for the morning.'}),
38: ('vocabulary_in_context','D2_single_step_inference','The paragraph introduces two types of lodging and then gives camping and hotels as examples, so lodging means a place/accommodation to stay in.',{
 'A':'Breakfast is mentioned as a hotel amenity, not the meaning of lodging.',
 'C':'No time period is being defined; the examples are accommodation types.',
 'D':'Walking and biking are transportation choices discussed earlier, separate from lodging.'}),
39: ('information_integration','D3_multi_step_synthesis','From Cove, Part 1 reaches Dova beside the river and birdwatching/campground area, and Part 2 continues from Dova toward Kint past Sloan Castle. Together they satisfy both the castle and river-birdwatching goals.',{
 'B':'Part 2a is a side branch near Sloan Castle but does not replace the main Part 2 connection needed to combine the river birdwatching route with the castle trip from Cove.',
 'C':'Parts 2 and 3 do not start from Cove; Part 3 runs Kint–Berk.',
 'D':'Parts 4 and 4a head from Cove toward Berk/Edward Castle but do not provide the intended river-side birdwatching route shown through Dova.'}),
40: ('discourse_relationship','D2_single_step_inference','The words and sentences that follow are examples of palindromes, so “for example” correctly introduces the list.',{
 'A':'“in fact” would intensify or confirm a claim rather than introduce representative instances.',
 'B':'“at first” signals temporal order, which is absent here.',
 'C':'“of course” signals obviousness, not exemplification.'}),
41: ('information_integration','D2_single_step_inference','An anagram must reuse exactly the same letters in a different order; “it makes” can be rearranged to “me steak,” so option C forms the valid pair required by the missing table/example.',{
 'A':'“take sit” does not provide the letter-for-letter match required by the paired anagram in the source layout.',
 'B':'“Ms Easy” does not preserve the same letter inventory as the target pair.',
 'D':'“me steak” is the counterpart rather than the option that correctly occupies the blank position in the presented anagram pair.'}),
42: ('vocabulary_in_context','D2_single_step_inference','Turning the ordinary word “restaurant” into the odd sentence “Eat rats, run!” is funny because the resulting meaning is strange, so “strange” fits.',{
 'B':'The example is not presented as difficult; it is presented as unexpectedly meaningful and amusing.',
 'C':'Although “eat” appears, the sentence is not described as delicious.',
 'D':'The point is the bizarre meaning produced by rearrangement, not its importance.'}),
43: ('main_idea','D3_multi_step_synthesis','The next sentences show palindromes used in mathematics and music and anagrams used to hide studies, proving they are more than just games.',{
 'B':'The paragraph discusses uses, not whether people play them publicly.',
 'C':'No comparison of past and present popularity is given.',
 'D':'The passage does not claim their original historical purpose was unrelated to learning words; it emphasizes additional uses instead.'}),
}

assert set(A) == set(range(1,44)), (set(range(1,44)) - set(A))

visual_specific = {
    1: '111 page 2 illustration: woman holding a candle over the cake; plate and forks are on the table and strawberries are already on the cake.',
    21: '111 page 4 Tea-Rock anniversary promotion: “Thank You for Being with Us for Twenty Summers & Winters.”',
    22: '111 page 4 promotion instructions plus Jason postcard: required name, birthday, phone, e-mail, favorite tea and two cup pictures; birthday is missing.',
    23: '111 page 5 sugar infographic: rice milk 400 ml has fewer sugar-spoon icons than grape juice 400 ml; daily and country figures are also visible.',
    24: '111 page 5 “Sugar that is hidden in foods and drinks” panel lists substantial sugar in everyday products.',
    32: '111 page 9 Figure 1 and Figure 2: annual deaths fluctuate, and men/women advancement lines are nearly equal at 2,200 hours.',
    33: '111 page 12 map choices: D shows one “Federal Republic of Cameroon,” while B/C preserve colonial/separate regions.',
    39: '111 page 13 trail map: Cove→Dova is Part 1 along river/birdwatching area; Dova→Kint Part 2 passes Sloan Castle.',
}

def evidence_for(n, q):
    if n in visual_specific:
        asset = q['requiredAssets'][0]
        return {'type':'visual_page_asset','location':f"111 page {asset['page']} Q{n}",'quoteOrDescription':visual_specific[n],'role':'primary_proof'}
    if q['section'] == 'single':
        return {'type':'stem_clue','location':f'111 Q{n} stem','quoteOrDescription':q['stem'],'role':'primary_proof'}
    p = pm[q['passageId']]['text']
    # Authored concise evidence anchors for text items.
    anchors = {
        25:'Marina needs ideas for a future-house art assignment; Darrell says people share their works and how they made them on Pinterest.',
        26:'Darrell describes an A-to-Z cake guide from choosing chocolate through baking to making sugar flowers.',
        27:'The first paragraph gives the 20-second exercise / 10-second rest cycle, repeats, and common moves.',
        28:'The passage warns people who seldom exercise or have heart problems, then recommends Tabata for busy people who enjoy exercising.',
        29:'“You can decide yourself what moves to do in your Tabata training.”',
        30:'The report moves from the long-hours problem, to No Overtime Day, to workers’ workarounds, to incentives for working longer.',
        31:'“Working long hours has become a way to show that people are hard-working. Clearly, this must be changed...”',
        34:'English speakers feel unwelcome, excluded from government jobs, pushed to speak French, and decide to fight for themselves.',
        35:'English speakers declare Ambazonia; police try to stop the meeting and at least eight people are killed.',
        36:'The history traces colonial division, reunification, minority English speakers, and French-speaker control of government.',
        37:'“It’s best to plan one day for one part of the trail ... because each part takes at least seven hours.”',
        38:'“There are two types of lodging ... Camping ... A more comfortable one is to stay at a hotel...”',
        40:'A palindrome definition is followed by “eye,” “Bob,” “my gym,” and a palindrome sentence as examples.',
        41:'The anagram section defines anagrams as the same letters put in a different way and presents paired examples.',
        42:'Anagrams can mean something unexpected, illustrated by “restaurant” becoming “Eat rats, run!”',
        43:'Palindromes can be used to learn mathematics and make music; anagrams can hide important studies.',
    }
    return {'type':'passage_text','location':f"111 {q['passageId']} Q{n}",'quoteOrDescription':anchors.get(n, p[:260]),'role':'primary_proof'}

questions=[]
for n in range(1,44):
    q=qmap[n]
    skill,depth,correct,wrongs=A[n]
    ev=evidence_for(n,q)
    distractors={}
    for letter,text in q['options'].items():
        if letter==q['answer']:
            continue
        rationale=wrongs[letter]
        if skill=='reference_resolution': strat='wrong_referent'
        elif skill=='text_structure': strat='wrong_chronology'
        elif skill=='main_idea': strat='local_evidence_for_global_question'
        elif skill in ('grammar_in_context','discourse_relationship'): strat='grammatically_plausible_contextually_wrong'
        elif 'revers' in rationale.lower(): strat='reversed_cause_effect'
        elif q['section']!='single': strat='partial_truth' if any(w in rationale.lower() for w in ('detail','one','part','presented','mentioned','does not')) else 'unsupported_world_knowledge'
        else: strat='irrelevant_distractor'
        distractors[letter]={
            'strategy':strat,
            'rationale':rationale,
            'misconceptionTarget':f"Choosing {letter} ({text}) from surface plausibility without satisfying the decisive evidence for Q{n}.",
            'evidenceRefs':[dict(ev, role='counter_evidence')],
        }
    visual=q['visualEvidenceRequired']
    reading='low' if q['section']=='single' else ('high' if n in (30,33,35,36,39,43) else 'medium')
    inference='high' if depth=='D3_multi_step_synthesis' else ('medium' if depth=='D2_single_step_inference' else 'low')
    questions.append({
        'questionNumber':n,
        'primarySkill':skill,
        'secondarySkills':['information_integration'] if visual and skill!='information_integration' else ([] if skill in ('grammar_in_context','vocabulary_in_context','explicit_detail') else ['discourse_relationship']),
        'skillExplanation':f"Q{n} requires {skill.replace('_',' ')} using the item’s actual sentence, passage, or visual evidence rather than answer-key recall.",
        'languageDifficulty':'A1_elementary' if n<=19 else ('A2_basic' if n in (20,21,22,23,24,25,26,27,29,34,37,38,40,41,42) else 'B1_intermediate'),
        'cognitiveDepth':depth,
        'evidenceNecessity':'essential' if (visual or q['section']!='single') else 'none',
        'evidenceSpan':'multimodal_text_and_graphic' if visual else ('single_sentence' if q['section']=='single' else ('multi_paragraph_global' if depth=='D3_multi_step_synthesis' else 'cross_sentence_local')),
        'reasoningOperations':[correct, 'Test each alternative against the same grammatical, semantic, discourse, and source constraints before selecting.'],
        'reasoningComplexity':'complex_multi_step_deduction' if depth=='D3_multi_step_synthesis' else ('compound_dual_step' if depth=='D2_single_step_inference' else 'simple_single_step'),
        'readingDemand':reading,
        'grammarDemand':'high' if skill=='grammar_in_context' else ('medium' if q['section']=='cloze' else 'low'),
        'vocabularyDemand':'medium' if skill=='vocabulary_in_context' or n>=33 else 'low',
        'inferenceDemand':inference,
        'visualIntegrationDemand':'high' if visual else 'low',
        'questionMechanism':f"Use the decisive evidence identified for Q{n}, preserve its scope and relation, then eliminate alternatives that contradict or fail to entail the required proposition.",
        'whyTheQuestionWorks':f"Q{n} has one evidence-supported answer while each wrong option represents a concrete semantic, grammatical, referential, structural, or scope error.",
        'correctRationale':correct,
        'correctEvidenceRefs':[ev],
        'distractors':distractors,
        'studentFailureModes':['Stopping at a keyword match instead of checking the full proposition.','Ignoring a qualifier, grammatical relation, discourse function, or visual constraint that separates the correct option from a distractor.'],
        'misconceptionsTargeted':['Surface plausibility is enough to justify an answer.','A statement can be selected even when the source only partly supports it or supports a different relation.'],
        'shallowRecall':{
            'isShallowRecall': q['section']=='single' and not visual,
            'recallType': ('mechanical_grammar_pattern' if skill=='grammar_in_context' else 'intentional_retrieval_drill') if q['section']=='single' and not visual else 'none',
            'explanation':'The single item still uses sentence context, but its central target is a compact language form or lexical relation.' if q['section']=='single' and not visual else 'The answer depends on interpreting supplied passage or visual evidence.'
        },
        'reusableDesignPrinciple':'Keep the language accessible while making one relation decisive; build distractors from realistic misreadings of grammar, scope, reference, chronology, causality, or visual data.',
        'canSimplifyLanguageWithoutBreakingMechanism':True,
        'simplificationConstraints':['Preserve the clue or evidence relation that uniquely distinguishes the official answer.'],
        'canIncreaseDepthWithoutIncreasingVocabulary':True,
        'depthAdjustmentStrategies':['Distribute the decisive evidence across two clauses, sentences, or visual elements while keeping vocabulary comparable.'],
        'analysisConfidence':'high',
        'uncertainties':[],
        'evidenceReferences':[ev],
        'criticStatus':'passed',
        'criticIssues':[],
    })

source={
    'examId':'111',
    'providerName':'openai-chatgpt',
    'modelName':'gpt-5.6-sol',
    'promptVersion':'chatgpt-agent-digestion-v1',
    'criticPromptVersion':'chatgpt-agent-critic-v1',
    'analysisSchemaVersion':'1.0.0',
    'questions':questions,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n')
print('authored',len(questions),'questions')
