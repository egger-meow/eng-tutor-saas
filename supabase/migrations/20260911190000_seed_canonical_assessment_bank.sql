-- Forward-only migration: Seed Canonical Direct Assessment Question Bank
-- Generated from packages/assessment/src/bank
-- Total Passages: 16
-- Total Items: 108

-- 1. Insert or update canonical reading passages
insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_01', 'The Sunny Neighborhood Garden', 'Last March, Mr. Lin and his neighbors transformed an empty parking lot into a community vegetable garden. Every Saturday morning, families gather to water tomatoes, pull weeds, and harvest fresh greens. Children learn where their food comes from, while grandparents share traditional farming techniques. Excess vegetables are placed in a free wooden basket near the gate for anyone in need. The garden has turned a quiet corner of the neighborhood into a lively gathering spot filled with conversation and laughter.', 84, 'grade_7', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_02', 'Notice: Lost Calico Kitten', 'LOST KITTEN: "Mochi" is a three-month-old female calico kitten with orange, black, and white patches. She has a pink collar with a small silver bell. She was last seen near the Riverside Park playground on Tuesday afternoon around 4:30 PM. Mochi is curious but frightened by loud traffic and dogs. If you spot her, please do not run toward her; instead, call or text 0912-345-678 immediately. A reward is offered for her safe return.', 77, 'grade_7', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_03', 'Grandpa Chen’s Early Morning Bakery', 'At four o’clock every morning, when most of the town is fast asleep, Grandpa Chen turns on the warm yellow lights of his bakery. For thirty-five years, he has baked scallion buns and sweet red bean toast by hand. He refuses to use modern electric mixers because he believes only careful hand-kneading gives the dough its soft, bouncy texture. By seven o’clock, long lines of junior-high students and office workers stretch down the sidewalk, eager for hot breakfast fresh from the brick oven.', 86, 'grade_7', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_04', 'The Plastic Bottle Rocket Experiment', 'During Friday’s Science Club meeting, Tina and her teammates built water rockets from two-liter soda bottles. First, they taped three cardboard triangles around the bottle neck to serve as steering fins. Next, they filled one-third of the bottle with water and sealed it with a rubber stopper connected to a bicycle air pump. When Tina pumped air into the chamber, the built-up air pressure forced the water downward through the nozzle, launching the rocket thirty meters into the clear afternoon sky.', 84, 'grade_7', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_05', 'Cycling Along the Pacific Highway', 'During the summer vacation, Leo and his father embarked on a five-day bicycle tour along Taiwan’s scenic East Coast Highway. Pedaling past towering sea cliffs and endless turquoise waves, Leo faced fierce headwinds that tested his physical endurance. However, whenever exhaustion threatened to stop him, kind strangers at roadside convenience stores offered chilled fruit and enthusiastic shouts of "Jiayou!" By the time they reached Taitung, Leo had discovered that the journey’s true value lay not in speed, but in resilience.', 84, 'grade_8', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_06', 'The Silent Glow of Mountain Fireflies', 'In late April, the forest trails of Xitou come alive with thousands of dancing green lanterns. These fireflies use bioluminescent flashing signals to communicate and attract mates in the darkness. However, light pollution from streetlamps, passing tourist flashlights, and smartphones can disrupt their delicate courtship rituals. To protect these vulnerable insects, local park rangers now require all nighttime visitors to wrap red cellophane paper over their torches, which softens the light and preserves the fireflies’ natural breeding habitat.', 82, 'grade_8', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_07', 'National Railway Museum Weekend Volunteer Schedule', 'WELCOME VOLUNTEERS: Shift A runs from 9:00 AM to 1:00 PM, focusing on ticket scanning and distributing bilingual floor maps at Entrance Gate 1. Shift B runs from 1:30 PM to 5:30 PM, guiding visitors through the vintage steam locomotive warehouse and answering questions about railway history. All student volunteers receive a free lunch voucher and four community service hours per shift. Please note: volunteers must attend a mandatory 15-minute briefing in Conference Room 201 before beginning their assigned duty.', 82, 'grade_8', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_08', 'A Postcard from Green Island', 'Dear Aunt Sarah, We arrived on Green Island yesterday after an hour-long ferry ride through choppy waves. This morning, our snorkeling instructor guided us into the coral reef at Chaikou. Underwater, the visibility was extraordinary: I swam right beside a green sea turtle and watched schools of fluorescent damselfish dart between sea anemones! Tonight, we plan to soak in the Zhaori Saltwater Hot Springs under the starry night sky. I wish you could experience this island paradise with us! Love, Kevin', 82, 'grade_8', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_09', 'The Unexpected Summer Downpour', 'Without warning, dark bruised clouds swallowed the afternoon sunshine, and cool wind whipped through the city avenues. Pedestrians scrambled beneath shop awnings just as heavy raindrops began pounding against the concrete. Street vendors hastily pulled waterproof blue tarpaulins over their fruit carts, while passing scooters sent silver plumes of spray across the flooded curbs. Ten minutes later, as abruptly as it had arrived, the storm moved inland, leaving behind clean air, puddle reflections, and an arched rainbow.', 80, 'grade_8', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_10', 'Student Forum: Digital Tablets vs. Paper Notebooks', 'At Zhongshan Junior High, students hold contrasting opinions regarding the school’s new tablet policy. Emily argues that digital tablets lighten heavy backpacks, allow instant searching through electronic textbooks, and eliminate paper waste. Conversely, Marcus contends that writing notes by hand on paper improves long-term memory retention and prevents digital distractions such as social media notifications and games. Teacher Wang suggests a balanced approach: using tablets for interactive science simulations while maintaining handwritten notebooks for reflective writing and math problem-solving.', 81, 'grade_8', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_11', 'Protecting the Formosan Black Bear', 'The Formosan black bear, recognized by the distinct white crescent V-shape on its chest, is Taiwan’s largest native land mammal. Living in remote mountain forests above 1,000 meters, these solitary omnivores feed primarily on wild acorns, berries, insects, and occasional small animals. Tragically, illegal wire snares and habitat fragmentation caused by road construction have reduced the wild population to an estimated 200 to 600 individuals. Conservation biologists urge the government to establish continuous wildlife corridors and strictly penalize poaching.', 81, 'grade_9', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_12', 'The Art of Taiwanese Hand Puppetry', 'Budaixi, or Taiwanese traditional glove puppetry, combines exquisite woodcarving, intricate costume embroidery, classical Chinese opera singing, and martial arts choreography. A skilled master puppeteer can manipulate several cloth puppets simultaneously, breathing vivid life into warriors, scholars, and comedic clowns using subtle finger movements. Although television and video games have captured young audiences in recent decades, innovative troupes now blend digital lighting and rock music with traditional storylines to introduce this cherished cultural heritage to modern generations.', 78, 'grade_9', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_13', 'Campus Waste Reduction Audit Report', 'The Student Council’s two-week campus waste audit revealed alarming statistics: students discarded an average of 420 single-use plastic drink cups and 180 lunchboxes daily. To combat this environmental toll, the council launched the "Zero-Waste Campus Initiative." Participating bubble tea shops near the school now offer a five-dollar discount to students who bring reusable tumblers. Within one month of implementation, disposable beverage container waste plunged by 48%, proving that targeted economic incentives combined with student enthusiasm can produce tangible conservation results.', 82, 'grade_9', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_14', 'The Global Journey of Bubble Tea', 'Invented in Taichung during the late 1980s by blending chilled Assam black milk tea with chewy tapioca pearls, bubble tea has evolved into an international culinary phenomenon. What began as an inventive afternoon snack at a modest teahouse is now served in major metropolitan centers from Tokyo to London and New York. Food historians attribute bubble tea’s worldwide success to its playful texture—described in Taiwan as "Q"—and its customizable sweetness levels, which allow global consumers to tailor every beverage to personal preference.', 84, 'grade_9', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_15', 'The Tainan Floating Solar Farm', 'Built upon the calm surface of a former commercial fish pond in coastal Tainan, the Chigu floating solar installation represents an innovative integration of renewable energy and space preservation. Floating photovoltaic panels benefit from the water’s natural cooling effect, which boosts solar energy conversion efficiency by up to 12% compared to conventional rooftop systems. Furthermore, the extensive panel shading slows down algae blooms and reduces pond water evaporation during scorching summer heatwaves, creating an environmentally mutually beneficial symbiosis.', 79, 'grade_9', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_16', 'The Sun Moon Lake Swimming Carnival', 'Every September, over twenty thousand swimmers from across the globe plunge into the shimmering waters of Sun Moon Lake for Taiwan’s most celebrated open-water athletic event. The non-competitive three-kilometer course stretches from Chaowu Pier across to Ita Thao Pier. Safety is paramount: all participants must tow an orange safety buoy and wear a brightly colored swim cap. Rather than racing for championship medals, participants celebrate personal fitness, camaraderies, and breathtaking vistas of mist-shrouded green peaks surrounding the alpine lake.', 82, 'grade_9', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

-- 2. Insert or update canonical assessment items
insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_core_01', 'vocabulary', 'core_vocabulary', 1, 'grade_7', 'single_choice', null, 'Which place is specifically designed for students to borrow books and study quietly?', '[{"id":"A","text":"a library"},{"id":"B","text":"a bakery"},{"id":"C","text":"a stadium"},{"id":"D","text":"a clinic"}]'::jsonb, 'A', null, array['place_noun', 'definition']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_core_02', 'vocabulary', 'core_vocabulary', 1, 'grade_7', 'short_answer', null, 'Type the English word for a person whose job is to put out fires and rescue people.', null, null, '["firefighter","fireman"]'::jsonb, array['occupation_noun', 'spelling']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_core_03', 'vocabulary', 'core_vocabulary', 2, 'grade_7', 'single_choice', null, 'The young puppy was very ______; it sniffed every corner of the new living room.', '[{"id":"A","text":"curious"},{"id":"B","text":"crowded"},{"id":"C","text":"painful"},{"id":"D","text":"bitter"}]'::jsonb, 'A', null, array['adjective', 'personality_trait']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_core_04', 'vocabulary', 'core_vocabulary', 2, 'grade_8', 'single_choice', null, 'Living near the subway station is very ______ because you can reach school in ten minutes.', '[{"id":"A","text":"convenient"},{"id":"B","text":"dangerous"},{"id":"C","text":"shy"},{"id":"D","text":"impatient"}]'::jsonb, 'A', null, array['adjective', 'daily_life']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_core_05', 'vocabulary', 'core_vocabulary', 3, 'grade_8', 'single_choice', null, 'Dumping toxic waste into rivers will seriously ______ clean drinking water for local communities.', '[{"id":"A","text":"pollute"},{"id":"B","text":"celebrate"},{"id":"C","text":"encourage"},{"id":"D","text":"pronounce"}]'::jsonb, 'A', null, array['verb', 'environment']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_core_06', 'vocabulary', 'core_vocabulary', 3, 'grade_8', 'short_answer', null, 'Type the single English noun for an optical instrument used to observe distant stars and planets in the night sky.', null, null, '["telescope"]'::jsonb, array['science_noun', 'spelling']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_core_07', 'vocabulary', 'core_vocabulary', 4, 'grade_9', 'single_choice', null, 'Because their natural bamboo forests are disappearing, giant pandas are classified as a(n) ______ species.', '[{"id":"A","text":"endangered"},{"id":"B","text":"artificial"},{"id":"C","text":"fashionable"},{"id":"D","text":"temporary"}]'::jsonb, 'A', null, array['adjective', 'conservation']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_core_08', 'vocabulary', 'core_vocabulary', 5, 'grade_9', 'single_choice', null, 'Solar and wind power are examples of ______ energy because they do not deplete Earth’s natural resources.', '[{"id":"A","text":"sustainable"},{"id":"B","text":"suspicious"},{"id":"C","text":"superficial"},{"id":"D","text":"accidental"}]'::jsonb, 'A', null, array['adjective', 'advanced_environment']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_ctx_01', 'vocabulary', 'contextual_meaning', 1, 'grade_7', 'single_choice', null, 'Read the sentence: "Walk two blocks, and the post office is on your right." What does "right" mean here?', '[{"id":"A","text":"the side opposite to left"},{"id":"B","text":"correct and true"},{"id":"C","text":"a moral entitlement"},{"id":"D","text":"immediately or exactly"}]'::jsonb, 'A', null, array['polysemy', 'direction']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_ctx_02', 'vocabulary', 'contextual_meaning', 2, 'grade_7', 'single_choice', null, 'Read the sentence: "The express train leaves the station at ten o’clock sharp." What does "leaves" mean here?', '[{"id":"A","text":"departs or goes away from"},{"id":"B","text":"green parts of a plant"},{"id":"C","text":"allows something to remain"},{"id":"D","text":"forgets to bring something"}]'::jsonb, 'A', null, array['polysemy', 'verb_definition']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_ctx_03', 'vocabulary', 'contextual_meaning', 2, 'grade_8', 'single_choice', null, 'Read the sentence: "The rough bark of the hundred-year-old pine tree protected it from forest insects." What does "bark" mean here?', '[{"id":"A","text":"the tough outer covering of a tree trunk"},{"id":"B","text":"the sharp loud cry of a guard dog"},{"id":"C","text":"a small wooden sailboat"},{"id":"D","text":"to shout commands angrily"}]'::jsonb, 'A', null, array['polysemy', 'nature']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_ctx_04', 'vocabulary', 'contextual_meaning', 3, 'grade_8', 'single_choice', null, 'Read the sentence: "The teacher treated every student in a fair manner during the speech contest." What does "fair" mean here?', '[{"id":"A","text":"treating everyone equally without favoritism"},{"id":"B","text":"light in color or pale"},{"id":"C","text":"an outdoor market or carnival"},{"id":"D","text":"pleasant and dry weather"}]'::jsonb, 'A', null, array['polysemy', 'justice']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_ctx_05', 'vocabulary', 'contextual_meaning', 3, 'grade_8', 'short_answer', null, 'Complete the sentence with the four-letter word meaning a queue of people waiting: "We waited in a long ______ outside the movie theater for tickets."', null, null, '["line"]'::jsonb, array['polysemy', 'fill_in_context']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_ctx_06', 'vocabulary', 'contextual_meaning', 4, 'grade_9', 'single_choice', null, 'Read the sentence: "Strong oceanic currents carried the fishing vessel several miles off course." What does "currents" mean here?', '[{"id":"A","text":"continuous movements of water in a particular direction"},{"id":"B","text":"belonging to the present time"},{"id":"C","text":"small dried sweet grapes"},{"id":"D","text":"widely accepted rumors"}]'::jsonb, 'A', null, array['polysemy', 'geography']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_ctx_07', 'vocabulary', 'contextual_meaning', 4, 'grade_9', 'short_answer', null, 'Fill in the word meaning a banking arrangement: "Kevin opened a savings ______ at the post office to deposit his red envelope money."', null, null, '["account"]'::jsonb, array['polysemy', 'financial_noun']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_ctx_08', 'vocabulary', 'contextual_meaning', 5, 'grade_9', 'single_choice', null, 'Read the sentence: "The young architect proposed a novel solution to cool high-rise buildings using natural sea breezes." What does "novel" mean here?', '[{"id":"A","text":"original, fresh, and interestingly new"},{"id":"B","text":"a long printed narrative story"},{"id":"C","text":"heavy and complicated to understand"},{"id":"D","text":"costly and difficult to maintain"}]'::jsonb, 'A', null, array['polysemy', 'advanced_adjective']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_form_01', 'vocabulary', 'word_form_usage', 1, 'grade_7', 'single_choice', null, 'Jenny sings ______ in the school choir; her voice always moves the audience.', '[{"id":"A","text":"sweetly"},{"id":"B","text":"sweet"},{"id":"C","text":"sweetness"},{"id":"D","text":"sweeten"}]'::jsonb, 'A', null, array['adverb_formation', 'syntax']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_form_02', 'vocabulary', 'word_form_usage', 2, 'grade_7', 'short_answer', null, 'Change the word in parentheses to its correct plural form: "The old house had several ______ (mouse) hiding inside the barn."', null, null, '["mice"]'::jsonb, array['irregular_plural', 'morphology']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_form_03', 'vocabulary', 'word_form_usage', 2, 'grade_8', 'single_choice', null, 'Students are reminded to pay close attention ______ the laboratory safety instructions.', '[{"id":"A","text":"to"},{"id":"B","text":"at"},{"id":"C","text":"with"},{"id":"D","text":"from"}]'::jsonb, 'A', null, array['preposition_collocation', 'verb_phrase']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_form_04', 'vocabulary', 'word_form_usage', 3, 'grade_8', 'short_answer', null, 'Type the comparative form of "bad" to complete the sentence: "Today’s cold wave is even ______ than yesterday’s chilly weather."', null, null, '["worse"]'::jsonb, array['irregular_comparative', 'morphology']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_form_05', 'vocabulary', 'word_form_usage', 3, 'grade_8', 'single_choice', null, 'Drinking sufficient water and getting enough sleep are vital for maintaining good ______. ', '[{"id":"A","text":"health"},{"id":"B","text":"healthy"},{"id":"C","text":"healthily"},{"id":"D","text":"healthier"}]'::jsonb, 'A', null, array['noun_formation', 'parts_of_speech']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_form_06', 'vocabulary', 'word_form_usage', 4, 'grade_9', 'short_answer', null, 'Add the correct negative prefix to "possible" to complete the sentence: "It is completely ______ for humans to survive on Mars without pressurized oxygen."', null, null, '["impossible"]'::jsonb, array['negative_prefix', 'morphology']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_form_07', 'vocabulary', 'word_form_usage', 4, 'grade_9', 'single_choice', null, 'Parents take great pride ______ their children’s honest efforts and steady improvement.', '[{"id":"A","text":"in"},{"id":"B","text":"on"},{"id":"C","text":"at"},{"id":"D","text":"for"}]'::jsonb, 'A', null, array['fixed_collocation', 'preposition']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'voc_form_08', 'vocabulary', 'word_form_usage', 5, 'grade_9', 'short_answer', null, 'Convert the verb "perform" into its corresponding noun: "The orchestra’s outstanding ______ earned a standing ovation from the crowd."', null, null, '["performance"]'::jsonb, array['nominalization', 'suffix_derivation']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_sen_01', 'grammar', 'basic_sentence_structure', 1, 'grade_7', 'single_choice', null, 'Tom and his younger brother ______ in the school library right now.', '[{"id":"A","text":"are"},{"id":"B","text":"is"},{"id":"C","text":"am"},{"id":"D","text":"be"}]'::jsonb, 'A', null, array['compound_subject', 'be_verb']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_sen_02', 'grammar', 'basic_sentence_structure', 1, 'grade_7', 'short_answer', null, 'Choose the correct pronoun (I or me) to complete the subject: "My sister and ______ baked chocolate cookies this morning."', null, null, '["I"]'::jsonb, array['pronoun_case', 'subject_syntax']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_sen_03', 'grammar', 'basic_sentence_structure', 2, 'grade_7', 'single_choice', null, '______ three foreign exchange students visiting our class today.', '[{"id":"A","text":"There are"},{"id":"B","text":"There is"},{"id":"C","text":"They are"},{"id":"D","text":"It has"}]'::jsonb, 'A', null, array['existential_there', 'plural_noun']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_sen_04', 'grammar', 'basic_sentence_structure', 2, 'grade_7', 'short_answer', null, 'Complete the sentence with the correct possessive pronoun: "This blue backpack belongs to Cindy; it is ______."', null, null, '["hers"]'::jsonb, array['possessive_pronoun', 'syntax']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_sen_05', 'grammar', 'basic_sentence_structure', 3, 'grade_8', 'single_choice', null, 'The freshly baked apple pie on the kitchen table smells ______.', '[{"id":"A","text":"delicious"},{"id":"B","text":"deliciously"},{"id":"C","text":"deliciousness"},{"id":"D","text":"more deliciously"}]'::jsonb, 'A', null, array['linking_verb', 'adjective_complement']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_sen_06', 'grammar', 'basic_sentence_structure', 3, 'grade_8', 'short_answer', null, 'Fill in the correct gerund form of "swim": "During the hot summer months, my brother enjoys ______ in the outdoor pool."', null, null, '["swimming"]'::jsonb, array['gerund_object', 'verb_pattern']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_sen_07', 'grammar', 'basic_sentence_structure', 4, 'grade_8', 'single_choice', null, 'The coach made every basketball player ______ twenty laps around the gymnasium.', '[{"id":"A","text":"run"},{"id":"B","text":"to run"},{"id":"C","text":"running"},{"id":"D","text":"ran"}]'::jsonb, 'A', null, array['causative_verb', 'bare_infinitive']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_sen_08', 'grammar', 'basic_sentence_structure', 5, 'grade_9', 'short_answer', null, 'Fill in the base form or -ing form of "knock": "Late last night, we clearly heard someone ______ on the front wooden door."', null, null, '["knock","knocking"]'::jsonb, array['sensory_verb', 'participle_complement']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_tns_01', 'grammar', 'verb_tense_agreement', 1, 'grade_7', 'single_choice', null, 'Mr. Wu ______ to his office by bicycle every weekday morning.', '[{"id":"A","text":"commutes"},{"id":"B","text":"commute"},{"id":"C","text":"is commute"},{"id":"D","text":"commuting"}]'::jsonb, 'A', null, array['simple_present', 'third_person_singular']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_tns_02', 'grammar', 'verb_tense_agreement', 1, 'grade_7', 'short_answer', null, 'Type the simple past tense of "walk": "Yesterday afternoon, grandma ______ her puppy in the community park."', null, null, '["walked"]'::jsonb, array['simple_past', 'regular_verb']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_tns_03', 'grammar', 'verb_tense_agreement', 2, 'grade_7', 'short_answer', null, 'Type the simple past tense of "see": "Last Friday evening, my friends and I ______ an exciting basketball match on television."', null, null, '["saw"]'::jsonb, array['simple_past', 'irregular_verb']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_tns_04', 'grammar', 'verb_tense_agreement', 2, 'grade_8', 'single_choice', null, 'Listen! The school band ______ their final rehearsal in the auditorium.', '[{"id":"A","text":"is practicing"},{"id":"B","text":"practiced"},{"id":"C","text":"practices"},{"id":"D","text":"will practice"}]'::jsonb, 'A', null, array['present_continuous', 'cue_word_listen']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_tns_05', 'grammar', 'verb_tense_agreement', 2, 'grade_8', 'short_answer', null, 'Complete with the future form using "will" and "visit": "Our family ______ Japan during the upcoming winter vacation."', null, null, '["will visit"]'::jsonb, array['simple_future', 'modal_auxiliary']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_tns_06', 'grammar', 'verb_tense_agreement', 3, 'grade_8', 'single_choice', null, 'While Susan was washing dishes, the telephone in the hallway suddenly ______.', '[{"id":"A","text":"rang"},{"id":"B","text":"was ringing"},{"id":"C","text":"rings"},{"id":"D","text":"has rung"}]'::jsonb, 'A', null, array['past_continuous_with_interruption', 'simple_past']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_tns_07', 'grammar', 'verb_tense_agreement', 3, 'grade_8', 'short_answer', null, 'Type the simple past tense of "fly": "Hundreds of migratory birds ______ south before the severe winter storm arrived."', null, null, '["flew"]'::jsonb, array['irregular_verb', 'simple_past']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_tns_08', 'grammar', 'verb_tense_agreement', 4, 'grade_9', 'short_answer', null, 'Type the past participle of "live" to complete the present perfect tense: "Our neighbors have ______ in this quiet town for more than twenty years."', null, null, '["lived"]'::jsonb, array['present_perfect', 'past_participle']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_tns_09', 'grammar', 'verb_tense_agreement', 4, 'grade_9', 'single_choice', null, 'Have you ever ______ to Sun Moon Lake to watch the sunrise over the misty mountains?', '[{"id":"A","text":"been"},{"id":"B","text":"gone"},{"id":"C","text":"went"},{"id":"D","text":"go"}]'::jsonb, 'A', null, array['present_perfect', 'been_to_vs_gone_to']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_tns_10', 'grammar', 'verb_tense_agreement', 5, 'grade_9', 'short_answer', null, 'Type the past participle of "destroy" to complete the past perfect tense: "By the time the rescue team arrived, the landslide had already ______ the wooden bridge."', null, null, '["destroyed"]'::jsonb, array['past_perfect', 'sequence_of_events']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_qneg_01', 'grammar', 'questions_and_negatives', 1, 'grade_7', 'single_choice', null, 'Henry ______ drink milk tea because he is sensitive to caffeine.', '[{"id":"A","text":"does not"},{"id":"B","text":"do not"},{"id":"C","text":"is not"},{"id":"D","text":"are not"}]'::jsonb, 'A', null, array['negation', 'does_not_third_person']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_qneg_02', 'grammar', 'questions_and_negatives', 1, 'grade_7', 'short_answer', null, 'Choose Do or Does to complete the question: "______ your parents enjoy hiking in the mountains on weekends?"', null, null, '["Do"]'::jsonb, array['yes_no_question', 'auxiliary_do_plural']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_qneg_03', 'grammar', 'questions_and_negatives', 2, 'grade_7', 'single_choice', null, '"______ is the local night market from our hotel?" — "It is about three kilometers away."', '[{"id":"A","text":"How far"},{"id":"B","text":"How long"},{"id":"C","text":"How often"},{"id":"D","text":"How much"}]'::jsonb, 'A', null, array['wh_question', 'distance_expression']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_qneg_04', 'grammar', 'questions_and_negatives', 2, 'grade_8', 'short_answer', null, 'Fill in the question word asking for location: "______ did you buy those handmade pottery cups?" — "At the Yingge Old Street."', null, null, '["Where"]'::jsonb, array['wh_question', 'place_inquiry']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_qneg_05', 'grammar', 'questions_and_negatives', 3, 'grade_8', 'single_choice', null, 'You are coming to the science fair with us tomorrow, ______?', '[{"id":"A","text":"aren’t you"},{"id":"B","text":"don’t you"},{"id":"C","text":"won’t you"},{"id":"D","text":"isn’t it"}]'::jsonb, 'A', null, array['tag_question', 'be_verb_affirmative_lead']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_qneg_06', 'grammar', 'questions_and_negatives', 3, 'grade_8', 'short_answer', null, 'Complete the tag question: "David doesn’t eat seafood, ______ he?"', null, null, '["does"]'::jsonb, array['tag_question', 'negative_lead_positive_tag']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_qneg_07', 'grammar', 'questions_and_negatives', 4, 'grade_9', 'single_choice', null, 'Let’s take a short break and grab some iced bubble tea, ______?', '[{"id":"A","text":"shall we"},{"id":"B","text":"will we"},{"id":"C","text":"don’t we"},{"id":"D","text":"aren’t we"}]'::jsonb, 'A', null, array['tag_question', 'lets_suggestion']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_qneg_08', 'grammar', 'questions_and_negatives', 5, 'grade_9', 'short_answer', null, 'Complete the tag question with the correct auxiliary: "Mr. Lin seldom watches television late at night, ______ he?"', null, null, '["does"]'::jsonb, array['tag_question', 'quasi_negative_adverb']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_mod_01', 'grammar', 'modifiers_and_relations', 1, 'grade_7', 'single_choice', null, 'Our class will take a comprehensive math quiz ______ Friday morning.', '[{"id":"A","text":"on"},{"id":"B","text":"in"},{"id":"C","text":"at"},{"id":"D","text":"by"}]'::jsonb, 'A', null, array['preposition_of_time', 'specific_day_morning']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_mod_02', 'grammar', 'modifiers_and_relations', 2, 'grade_7', 'short_answer', null, 'Type the preposition meaning below the shade of: "Several tired hikers sat ______ the big banyan tree to rest."', null, null, '["under","beneath"]'::jsonb, array['preposition_of_place', 'spatial_relation']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_mod_03', 'grammar', 'modifiers_and_relations', 2, 'grade_8', 'single_choice', null, 'The typhoon brought torrential rain and fierce winds, ______ all outdoor sports competitions were postponed.', '[{"id":"A","text":"so"},{"id":"B","text":"because"},{"id":"C","text":"although"},{"id":"D","text":"or"}]'::jsonb, 'A', null, array['conjunction', 'cause_and_effect']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_mod_04', 'grammar', 'modifiers_and_relations', 3, 'grade_8', 'short_answer', null, 'Type the comparative form of "fast": "A bullet train travels much ______ than a regular passenger bus."', null, null, '["faster"]'::jsonb, array['comparative_degree', 'adverb_comparison']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_mod_05', 'grammar', 'modifiers_and_relations', 3, 'grade_8', 'single_choice', null, 'Yushan, with an elevation of nearly 4,000 meters, is ______ mountain in Taiwan.', '[{"id":"A","text":"the highest"},{"id":"B","text":"the most high"},{"id":"C","text":"highest"},{"id":"D","text":"more higher"}]'::jsonb, 'A', null, array['superlative_degree', 'geography']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_mod_06', 'grammar', 'modifiers_and_relations', 4, 'grade_8', 'short_answer', null, 'Fill in the subordinate conjunction meaning in spite of the fact that: "______ it was raining heavily, the dedicated volunteers continued cleaning the beach."', null, null, '["Although","Though"]'::jsonb, array['concessive_conjunction', 'adverbial_clause']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_mod_07', 'grammar', 'modifiers_and_relations', 4, 'grade_9', 'single_choice', null, 'The soup was ______ hot for the little boy to swallow without blowing on it first.', '[{"id":"A","text":"too"},{"id":"B","text":"so"},{"id":"C","text":"very"},{"id":"D","text":"quite"}]'::jsonb, 'A', null, array['correlative_modifier', 'too_to_structure']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_mod_08', 'grammar', 'modifiers_and_relations', 5, 'grade_9', 'short_answer', null, 'Complete the correlative pair with one word: "Grace is not only an accomplished pianist ______ also an Olympic-level swimmer."', null, null, '["but"]'::jsonb, array['correlative_conjunction', 'parallelism']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_cpx_01', 'grammar', 'complex_structures', 2, 'grade_8', 'single_choice', null, 'Always remember to wash your hands thoroughly before you ______ dinner with your family.', '[{"id":"A","text":"eat"},{"id":"B","text":"ate"},{"id":"C","text":"will eat"},{"id":"D","text":"eating"}]'::jsonb, 'A', null, array['time_clause', 'present_replaces_future']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_cpx_02', 'grammar', 'complex_structures', 2, 'grade_8', 'short_answer', null, 'Fill in the correct present form of "rain" in this conditional sentence: "If it ______ tomorrow, our outdoor sports meet will be moved inside."', null, null, '["rains"]'::jsonb, array['first_conditional', 'if_clause']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_cpx_03', 'grammar', 'complex_structures', 3, 'grade_8', 'single_choice', null, 'English ______ as an official language in international aviation and maritime communications.', '[{"id":"A","text":"is used"},{"id":"B","text":"uses"},{"id":"C","text":"was using"},{"id":"D","text":"has used"}]'::jsonb, 'A', null, array['passive_voice', 'present_passive']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_cpx_04', 'grammar', 'complex_structures', 3, 'grade_8', 'short_answer', null, 'Type the past participle of "write": "The famous detective novel was ______ by Arthur Conan Doyle."', null, null, '["written"]'::jsonb, array['passive_voice', 'past_passive']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_cpx_05', 'grammar', 'complex_structures', 4, 'grade_9', 'single_choice', null, 'The dedicated veterinarian ______ treated the injured Formosan deer received a community award.', '[{"id":"A","text":"who"},{"id":"B","text":"which"},{"id":"C","text":"whom"},{"id":"D","text":"whose"}]'::jsonb, 'A', null, array['relative_clause', 'relative_pronoun_person']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_cpx_06', 'grammar', 'complex_structures', 4, 'grade_9', 'short_answer', null, 'Type the relative pronoun (which or that) referring to a vehicle: "The solar bus ______ runs between the harbor and downtown operates every ten minutes."', null, null, '["that","which"]'::jsonb, array['relative_clause', 'inanimate_relative_pronoun']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_cpx_07', 'grammar', 'complex_structures', 4, 'grade_9', 'single_choice', null, 'Climatologists warn ______ global temperatures will continue rising if carbon emissions are not reduced.', '[{"id":"A","text":"that"},{"id":"B","text":"what"},{"id":"C","text":"which"},{"id":"D","text":"who"}]'::jsonb, 'A', null, array['noun_clause', 'that_conjunction']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_cpx_08', 'grammar', 'complex_structures', 5, 'grade_9', 'short_answer', null, 'Complete the indirect question with the correct form of "be": "Excuse me, could you tell me where the nearest train station ______?"', null, null, '["is"]'::jsonb, array['indirect_question', 'word_order']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_cpx_09', 'grammar', 'complex_structures', 5, 'grade_9', 'single_choice', null, 'I recently met a young software engineer ______ mobile app won the national innovation contest.', '[{"id":"A","text":"whose"},{"id":"B","text":"who"},{"id":"C","text":"which"},{"id":"D","text":"whom"}]'::jsonb, 'A', null, array['relative_clause', 'possessive_relative_pronoun']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'grm_cpx_10', 'grammar', 'complex_structures', 5, 'grade_9', 'short_answer', null, 'Complete the passive with the past participle of "recycle": "In Taiwan, all plastic bottles and aluminum cans must be ______."', null, null, '["recycled"]'::jsonb, array['modal_passive', 'passive_voice']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_exp_01', 'reading', 'explicit_information', 1, 'grade_7', 'single_choice', 'pass_01', 'According to the passage, where are excess vegetables placed for people in need?', '[{"id":"A","text":"in a wooden basket near the gate"},{"id":"B","text":"inside the community parking lot"},{"id":"C","text":"at the local supermarket counter"},{"id":"D","text":"in front of Mr. Lin’s house"}]'::jsonb, 'A', null, array['detail_retrieval', 'location']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_mid_01', 'reading', 'main_idea', 2, 'grade_7', 'single_choice', 'pass_01', 'What is the main topic of the passage?', '[{"id":"A","text":"How a community garden brought neighbors together"},{"id":"B","text":"The financial cost of buying fresh vegetables"},{"id":"C","text":"Why parking lots should be closed in cities"},{"id":"D","text":"How to plant organic tomatoes in hot weather"}]'::jsonb, 'A', null, array['main_topic', 'community']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_int_01', 'reading', 'information_integration', 2, 'grade_7', 'single_choice', 'pass_01', 'How did the empty lot change after becoming a community garden?', '[{"id":"A","text":"It changed from an unused space into a lively social hub."},{"id":"B","text":"It became a crowded commercial parking business."},{"id":"C","text":"It was sold to a private construction company."},{"id":"D","text":"It created disagreements between children and grandparents."}]'::jsonb, 'A', null, array['synthesis', 'before_and_after']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_exp_02', 'reading', 'explicit_information', 1, 'grade_7', 'short_answer', 'pass_02', 'According to the notice, what color is the collar that Mochi wears?', null, null, '["pink","a pink collar"]'::jsonb, array['detail_retrieval', 'factual_attribute']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_inf_01', 'reading', 'inference', 2, 'grade_7', 'single_choice', 'pass_02', 'Why does the notice ask people NOT to run toward Mochi if they see her?', '[{"id":"A","text":"She gets scared easily and might run away."},{"id":"B","text":"She is dangerous and bites strangers."},{"id":"C","text":"She has already been found by the police."},{"id":"D","text":"Her collar has a tracker that stops working if chased."}]'::jsonb, 'A', null, array['inference', 'behavioral_cause']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_exp_03', 'reading', 'explicit_information', 2, 'grade_7', 'single_choice', 'pass_03', 'Why does Grandpa Chen avoid using modern electric dough mixers?', '[{"id":"A","text":"He believes hand-kneading makes the bread soft and bouncy."},{"id":"B","text":"Electric mixers are too expensive to repair."},{"id":"C","text":"His small brick oven cannot fit mixer parts."},{"id":"D","text":"The bakery lacks electrical wiring before dawn."}]'::jsonb, 'A', null, array['factual_detail', 'motivation']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_vic_01', 'reading', 'vocabulary_in_context', 2, 'grade_7', 'single_choice', 'pass_03', 'In the passage, what does the word "stretch" mean in the phrase "stretch down the sidewalk"?', '[{"id":"A","text":"extend in a continuous long line"},{"id":"B","text":"do physical warm-up exercises"},{"id":"C","text":"pull something until it breaks"},{"id":"D","text":"widen the paved walkway"}]'::jsonb, 'A', null, array['contextual_clue', 'phrase_meaning']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_inf_02', 'reading', 'inference', 3, 'grade_7', 'single_choice', 'pass_03', 'What can we infer about Grandpa Chen from the passage?', '[{"id":"A","text":"He takes immense pride in his traditional craft."},{"id":"B","text":"He plans to retire and close the bakery soon."},{"id":"C","text":"He prefers selling western cakes over traditional buns."},{"id":"D","text":"He only bakes when students ask him to."}]'::jsonb, 'A', null, array['character_inference', 'deduction']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_exp_04', 'reading', 'explicit_information', 2, 'grade_7', 'single_choice', 'pass_04', 'What was the purpose of attaching cardboard triangles to the bottle neck?', '[{"id":"A","text":"To act as steering fins"},{"id":"B","text":"To stop water from leaking out"},{"id":"C","text":"To make the rocket heavier"},{"id":"D","text":"To connect the bicycle pump"}]'::jsonb, 'A', null, array['detail_retrieval', 'purpose']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_mid_02', 'reading', 'main_idea', 2, 'grade_7', 'single_choice', 'pass_04', 'Which title best summarizes this passage?', '[{"id":"A","text":"Building and Launching a Water Rocket"},{"id":"B","text":"The Dangers of High Air Pressure"},{"id":"C","text":"How to Recycle Plastic Soda Bottles"},{"id":"D","text":"Tina’s Favorite Friday Science Class"}]'::jsonb, 'A', null, array['title_selection', 'gist']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_mid_03', 'reading', 'main_idea', 3, 'grade_8', 'single_choice', 'pass_05', 'What is the main lesson Leo learned from his bicycle tour?', '[{"id":"A","text":"Perseverance and endurance matter more than finishing fast."},{"id":"B","text":"East Coast headwinds make cycling impossible in summer."},{"id":"C","text":"It is safer to travel by train than by bicycle."},{"id":"D","text":"Convenience stores sell the best cycling equipment."}]'::jsonb, 'A', null, array['theme', 'moral_takeaway']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_inf_03', 'reading', 'inference', 3, 'grade_8', 'single_choice', 'pass_05', 'Why did the shouts of "Jiayou!" help Leo during the hardest parts of the ride?', '[{"id":"A","text":"They provided emotional encouragement when he was exhausted."},{"id":"B","text":"They warned him about dangerous road construction ahead."},{"id":"C","text":"They instructed him which gear to use on steep hills."},{"id":"D","text":"They reminded him to catch up with his father."}]'::jsonb, 'A', null, array['inference', 'psychological_effect']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_int_02', 'reading', 'information_integration', 3, 'grade_8', 'short_answer', 'pass_05', 'According to the passage, how many days did the bicycle tour take?', null, null, '["five","5","five days","5 days"]'::jsonb, array['factual_integration', 'numerical_retrieval']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_exp_05', 'reading', 'explicit_information', 2, 'grade_8', 'single_choice', 'pass_06', 'What are nighttime visitors required to wrap around their flashlights?', '[{"id":"A","text":"red cellophane paper"},{"id":"B","text":"dark green cloth"},{"id":"C","text":"thick black electrical tape"},{"id":"D","text":"yellow waterproof plastic"}]'::jsonb, 'A', null, array['factual_detail', 'regulation']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_vic_02', 'reading', 'vocabulary_in_context', 3, 'grade_8', 'single_choice', 'pass_06', 'In the passage, what does the word "disrupt" mean in the context of firefly courtship?', '[{"id":"A","text":"interrupt or throw into confusion"},{"id":"B","text":"speed up and improve"},{"id":"C","text":"illuminate more brightly"},{"id":"D","text":"protect from natural enemies"}]'::jsonb, 'A', null, array['contextual_vocabulary', 'ecological_context']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_inf_04', 'reading', 'inference', 3, 'grade_8', 'single_choice', 'pass_06', 'Why would bright white light interfere with firefly mating?', '[{"id":"A","text":"It overpowers their subtle bioluminescent flashes, making signals unreadable."},{"id":"B","text":"It heats up the forest trail and harms tree roots."},{"id":"C","text":"It causes fireflies to lose their wings."},{"id":"D","text":"It attracts bats that hunt only in bright light."}]'::jsonb, 'A', null, array['scientific_inference', 'cause_and_effect']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_exp_06', 'reading', 'explicit_information', 3, 'grade_8', 'short_answer', 'pass_07', 'According to the notice, in which room does the mandatory volunteer briefing take place?', null, null, '["Conference Room 201","Room 201","201"]'::jsonb, array['notice_detail', 'room_number']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_int_03', 'reading', 'information_integration', 3, 'grade_8', 'single_choice', 'pass_07', 'If a student volunteer works Shift A, which of the following is true?', '[{"id":"A","text":"They work from 9:00 AM to 1:00 PM and receive four service hours."},{"id":"B","text":"They guide visitors in the locomotive warehouse until 5:30 PM."},{"id":"C","text":"They do not need to attend the morning briefing."},{"id":"D","text":"They must bring their own lunch from home."}]'::jsonb, 'A', null, array['schedule_synthesis', 'comparison']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_exp_07', 'reading', 'explicit_information', 2, 'grade_8', 'single_choice', 'pass_08', 'Where did Kevin go snorkeling with his instructor?', '[{"id":"A","text":"At the coral reef at Chaikou"},{"id":"B","text":"Inside the Zhaori Hot Springs"},{"id":"C","text":"Beside the harbor ferry dock"},{"id":"D","text":"Near the island airport runway"}]'::jsonb, 'A', null, array['factual_detail', 'location']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_inf_05', 'reading', 'inference', 3, 'grade_8', 'single_choice', 'pass_08', 'What was the author’s tone in this postcard?', '[{"id":"A","text":"Enthusiastic and delighted"},{"id":"B","text":"Homesick and worried"},{"id":"C","text":"Bored and disappointed"},{"id":"D","text":"Apologetic and regretful"}]'::jsonb, 'A', null, array['tone_inference', 'author_attitude']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_int_04', 'reading', 'information_integration', 4, 'grade_8', 'single_choice', 'pass_08', 'Based on the postcard, what does Kevin’s travel itinerary look like?', '[{"id":"A","text":"Ferry arrival yesterday, snorkeling this morning, and hot springs tonight."},{"id":"B","text":"Snorkeling yesterday, ferry departure this morning, and flight tonight."},{"id":"C","text":"Hot springs yesterday, ferry ride this morning, and snorkeling tomorrow."},{"id":"D","text":"Resting yesterday, airport arrival this morning, and swimming tomorrow."}]'::jsonb, 'A', null, array['chronology_integration', 'itinerary']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_mid_04', 'reading', 'main_idea', 3, 'grade_8', 'single_choice', 'pass_09', 'What does this passage primarily depict?', '[{"id":"A","text":"A sudden, brief summer thunderstorm and its immediate aftermath"},{"id":"B","text":"The severe financial losses of outdoor fruit vendors"},{"id":"C","text":"Why city sewer drainage systems fail during typhoon season"},{"id":"D","text":"The scientific atmospheric cause of rainbow formation"}]'::jsonb, 'A', null, array['passage_gist', 'descriptive_narrative']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_vic_03', 'reading', 'vocabulary_in_context', 3, 'grade_8', 'single_choice', 'pass_09', 'In the passage, what does the word "abruptly" mean in the phrase "as abruptly as it had arrived"?', '[{"id":"A","text":"suddenly and unexpectedly"},{"id":"B","text":"quietly and slowly"},{"id":"C","text":"according to a schedule"},{"id":"D","text":"with great difficulty"}]'::jsonb, 'A', null, array['adverb_meaning', 'contextual_clue']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_mid_05', 'reading', 'main_idea', 3, 'grade_8', 'single_choice', 'pass_10', 'What is the main debate discussed in this forum passage?', '[{"id":"A","text":"The advantages and drawbacks of digital tablets versus paper notebooks in school"},{"id":"B","text":"The cost of purchasing interactive science software licenses"},{"id":"C","text":"Why social media should be banned from all school campuses"},{"id":"D","text":"How to reduce the weight of student backpacks with e-readers"}]'::jsonb, 'A', null, array['central_argument', 'forum_topic']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_int_05', 'reading', 'information_integration', 4, 'grade_8', 'single_choice', 'pass_10', 'How does Teacher Wang’s proposal resolve the disagreement between Emily and Marcus?', '[{"id":"A","text":"By combining tablets for interactive simulations with handwriting for math and reflection"},{"id":"B","text":"By banning tablets completely in all classrooms to prevent distraction"},{"id":"C","text":"By requiring all textbooks to be printed on recycled paper"},{"id":"D","text":"By letting students vote on whether to bring smartphones to school"}]'::jsonb, 'A', null, array['point_of_view_synthesis', 'compromise']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_inf_06', 'reading', 'inference', 4, 'grade_8', 'single_choice', 'pass_10', 'What concern does Marcus have about using tablets that Emily does not mention?', '[{"id":"A","text":"The threat of online notifications diverting student focus away from lessons"},{"id":"B","text":"The high electricity consumption of charging devices overnight"},{"id":"C","text":"The physical fragility of tablet glass screens when dropped"},{"id":"D","text":"The difficulty of typing Chinese characters on digital keyboards"}]'::jsonb, 'A', null, array['contrastive_inference', 'implicit_objection']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_exp_08', 'reading', 'explicit_information', 3, 'grade_9', 'single_choice', 'pass_11', 'What distinctive physical characteristic identifies the Formosan black bear?', '[{"id":"A","text":"A white crescent V-shape on its chest"},{"id":"B","text":"Golden spots across its back"},{"id":"C","text":"A short white tail and gray paws"},{"id":"D","text":"Long curved tusks beside its snout"}]'::jsonb, 'A', null, array['zoological_detail', 'identification']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_vic_04', 'reading', 'vocabulary_in_context', 4, 'grade_9', 'single_choice', 'pass_11', 'In the passage, what does the word "solitary" mean in "these solitary omnivores"?', '[{"id":"A","text":"living and hunting alone rather than in groups"},{"id":"B","text":"fierce and aggressive toward humans"},{"id":"C","text":"sleeping throughout the entire winter season"},{"id":"D","text":"traveling long distances along public roads"}]'::jsonb, 'A', null, array['contextual_clue', 'biological_term']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_inf_07', 'reading', 'inference', 4, 'grade_9', 'single_choice', 'pass_11', 'Why do conservation biologists recommend establishing wildlife corridors across mountain roads?', '[{"id":"A","text":"To reconnect fragmented habitats so bears can safely find food and mates"},{"id":"B","text":"To allow tourists to photograph bears without leaving their vehicles"},{"id":"C","text":"To trap bears and transport them into national zoos"},{"id":"D","text":"To keep wild bears away from mountain acorn trees"}]'::jsonb, 'A', null, array['conservation_inference', 'problem_solution']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_mid_06', 'reading', 'main_idea', 4, 'grade_9', 'single_choice', 'pass_12', 'What is the central focus of the passage on Budaixi?', '[{"id":"A","text":"The rich traditions of hand puppetry and how modern troupes revitalize it"},{"id":"B","text":"Why video games are replacing live performing arts in Taiwan"},{"id":"C","text":"The technical process of carving wooden puppet heads"},{"id":"D","text":"The biographies of famous classical Chinese opera singers"}]'::jsonb, 'A', null, array['cultural_theme', 'heritage']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_vic_05', 'reading', 'vocabulary_in_context', 4, 'grade_9', 'single_choice', 'pass_12', 'In the passage, what does the phrase "breathing vivid life into" mean?', '[{"id":"A","text":"making inanimate objects seem energetic and real"},{"id":"B","text":"blowing air into hollow wooden toys"},{"id":"C","text":"providing medical mouth-to-mouth resuscitation"},{"id":"D","text":"painting colorful patterns onto silk costumes"}]'::jsonb, 'A', null, array['figurative_language', 'idiomatic_expression']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_mid_07', 'reading', 'main_idea', 4, 'grade_9', 'single_choice', 'pass_13', 'What is the main purpose of this audit report?', '[{"id":"A","text":"To demonstrate how student initiatives and discounts successfully cut campus waste"},{"id":"B","text":"To complain about poor sanitary conditions in the school cafeteria"},{"id":"C","text":"To encourage students to stop purchasing bubble tea near school"},{"id":"D","text":"To calculate the monetary profit of local beverage businesses"}]'::jsonb, 'A', null, array['report_objective', 'environmental_audit']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_int_06', 'reading', 'information_integration', 4, 'grade_9', 'single_choice', 'pass_13', 'Which strategy directly led to the 48% reduction in single-use beverage waste?', '[{"id":"A","text":"Offering a monetary discount for customers bringing reusable tumblers"},{"id":"B","text":"Banning all plastic drink containers from being brought on campus"},{"id":"C","text":"Fining students who threw away disposable lunchboxes"},{"id":"D","text":"Replacing tea stands with outdoor water fountains"}]'::jsonb, 'A', null, array['cause_and_effect_integration', 'policy_result']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_inf_08', 'reading', 'inference', 4, 'grade_9', 'short_answer', 'pass_13', 'According to the report, by what exact percentage did disposable drink container waste decrease after one month?', null, null, '["48%","48 percent","48"]'::jsonb, array['data_retrieval', 'percentage']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_vic_06', 'reading', 'vocabulary_in_context', 4, 'grade_9', 'single_choice', 'pass_14', 'In the passage, what does the word "phenomenon" describe?', '[{"id":"A","text":"a remarkable, widely popular trend or occurrence"},{"id":"B","text":"a dangerous weather event"},{"id":"C","text":"a temporary scientific error"},{"id":"D","text":"an ancient ceremonial ritual"}]'::jsonb, 'A', null, array['advanced_vocabulary', 'cultural_phenomenon']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_int_07', 'reading', 'information_integration', 4, 'grade_9', 'single_choice', 'pass_14', 'According to food historians, which two factors explain bubble tea’s global appeal?', '[{"id":"A","text":"The bouncy tapioca texture and adjustable sweetness options"},{"id":"B","text":"The low production cost and hot serving temperature"},{"id":"C","text":"The presence of organic milk and traditional Chinese herbal medicine"},{"id":"D","text":"Exclusive availability in large metropolitan subway stations"}]'::jsonb, 'A', null, array['multi_factor_synthesis', 'culinary_analysis']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_int_08', 'reading', 'information_integration', 5, 'grade_9', 'single_choice', 'pass_15', 'How does locating solar panels on water provide mutual benefits for both energy generation and pond ecology?', '[{"id":"A","text":"Water cools the panels to boost power output, while panels shade water to reduce evaporation and algae."},{"id":"B","text":"Panels heat the pond to accelerate fish breeding, while fish clean the panel glass."},{"id":"C","text":"Panels filter muddy water for irrigation, while pond waves generate tidal electricity."},{"id":"D","text":"The system eliminates all commercial fish farming in coastal Tainan."}]'::jsonb, 'A', null, array['symbiotic_synthesis', 'renewable_technology']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_inf_09', 'reading', 'inference', 5, 'grade_9', 'single_choice', 'pass_15', 'Why is floating solar particularly advantageous for a densely populated island like Taiwan?', '[{"id":"A","text":"It generates clean electricity without competing for scarce agricultural or urban land."},{"id":"B","text":"It prevents typhoons from making landfall along the southwestern coast."},{"id":"C","text":"It produces electricity even at midnight when there is no sunshine."},{"id":"D","text":"It eliminates the need for high-voltage transmission cables."}]'::jsonb, 'A', null, array['spatial_inference', 'societal_benefit']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_mid_08', 'reading', 'main_idea', 5, 'grade_9', 'single_choice', 'pass_16', 'What is the primary spirit of the Sun Moon Lake Swimming Carnival as portrayed in the passage?', '[{"id":"A","text":"Participating for fitness, friendship, and natural beauty rather than winning medals"},{"id":"B","text":"Competing for record-breaking speed and championship cash prizes"},{"id":"C","text":"Promoting competitive triathlon gear manufactured in Taiwan"},{"id":"D","text":"Testing emergency rescue response times on alpine lakes"}]'::jsonb, 'A', null, array['central_philosophy', 'sports_culture']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_int_09', 'reading', 'information_integration', 5, 'grade_9', 'short_answer', 'pass_16', 'According to the passage, how long is the open-water swimming course in kilometers?', null, null, '["three","3","3 kilometers","3 km","three kilometers"]'::jsonb, array['factual_retrieval', 'course_length']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();
