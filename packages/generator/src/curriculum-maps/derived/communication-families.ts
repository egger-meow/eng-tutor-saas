export interface CommunicationFamily {
  familyId: string
  titleZh: string
  officialFunctionIds: string[]
  keyTargetPhrases: string[]
  typicalGenres: Array<'dialogue' | 'notice' | 'instructions' | 'schedule' | 'article' | 'narrative' | 'mini-report'>
  dialogueScaffold: {
    initiatorRole: string
    respondentRole: string
    exampleTurn: string
  }
  annotationSource: 'paper-english-derived'
}

export const communicationFamilies: CommunicationFamily[] = [
  {
    familyId: 'request-permission',
    titleZh: '請求協助與徵詢許可',
    officialFunctionIds: ['cf-making-requests', 'cf-asking-permission'],
    keyTargetPhrases: ['Would you please...?', 'Could you help me with...?', 'May I use...?', 'Is it okay if I...?'],
    typicalGenres: ['dialogue', 'notice'],
    dialogueScaffold: {
      initiatorRole: 'Student / Teammate',
      respondentRole: 'Teacher / Partner',
      exampleTurn: 'A: Could you please check this connection? B: Sure, let me take a look.',
    },
    annotationSource: 'paper-english-derived',
  },
  {
    familyId: 'apology-response',
    titleZh: '致歉與回應致歉',
    officialFunctionIds: ['cf-apologizing'],
    keyTargetPhrases: ['I am terribly sorry for...', 'Sorry about the delay', 'Never mind', 'No worries, we can fix it'],
    typicalGenres: ['dialogue', 'notice'],
    dialogueScaffold: {
      initiatorRole: 'Teammate',
      respondentRole: 'Teammate',
      exampleTurn: "A: I'm sorry for dropping the lens. B: Don't worry, it is not broken.",
    },
    annotationSource: 'paper-english-derived',
  },
  {
    familyId: 'agreement-disagreement',
    titleZh: '贊同、部分贊同與委婉異議',
    officialFunctionIds: ['cf-agreement-disagreement'],
    keyTargetPhrases: ['I completely agree with...', 'Exactly', 'I see your point, but...', "I'm afraid I have a different view"],
    typicalGenres: ['dialogue', 'mini-report'],
    dialogueScaffold: {
      initiatorRole: 'Collaborator A',
      respondentRole: 'Collaborator B',
      exampleTurn: 'A: We should replace every sensor now. B: I see what you mean, but changing one at a time is safer.',
    },
    annotationSource: 'paper-english-derived',
  },
  {
    familyId: 'asking-giving-directions',
    titleZh: '問路與指引方向',
    officialFunctionIds: ['cf-asking-giving-directions'],
    keyTargetPhrases: ['How do I get to...?', 'Go straight for two blocks', 'Turn left at the intersection', 'It is on your right'],
    typicalGenres: ['dialogue', 'instructions', 'notice'],
    dialogueScaffold: {
      initiatorRole: 'Visitor',
      respondentRole: 'Resident / Guide',
      exampleTurn: 'A: Excuse me, how do I get to the science museum? B: Walk straight down Main Street and turn right at the bank.',
    },
    annotationSource: 'paper-english-derived',
  },
  {
    familyId: 'phone-communication',
    titleZh: '電話應答與留言',
    officialFunctionIds: ['cf-telephoning'],
    keyTargetPhrases: ['May I speak to...?', 'This is ... calling', 'Could you take a message?', 'Hold on a second, please'],
    typicalGenres: ['dialogue', 'notice'],
    dialogueScaffold: {
      initiatorRole: 'Caller',
      respondentRole: 'Receiver',
      exampleTurn: "A: Hello, may I speak to Dr. Chen? B: I'm afraid she is in a meeting. Would you like to leave a message?",
    },
    annotationSource: 'paper-english-derived',
  },
  {
    familyId: 'invitation-response',
    titleZh: '提出邀請、接受與婉拒',
    officialFunctionIds: ['cf-invitations'],
    keyTargetPhrases: ['Would you like to join us for...?', "I'd love to, thank you!", "I'd love to, but I have to finish my project"],
    typicalGenres: ['dialogue', 'notice'],
    dialogueScaffold: {
      initiatorRole: 'Host / Friend',
      respondentRole: 'Invitee',
      exampleTurn: 'A: Would you like to join our robotics workshop this Saturday? B: That sounds great! What time does it start?',
    },
    annotationSource: 'paper-english-derived',
  },
  {
    familyId: 'suggestion-advice',
    titleZh: '提議與給予建議',
    officialFunctionIds: ['cf-suggestions-advice'],
    keyTargetPhrases: ['Why don’t we...?', 'How about trying...?', 'You should check...', 'You had better not...'],
    typicalGenres: ['dialogue', 'instructions'],
    dialogueScaffold: {
      initiatorRole: 'Advisor / Partner',
      respondentRole: 'Learner',
      exampleTurn: "A: Why don't we test the battery voltage first? B: Good idea, that will save us time.",
    },
    annotationSource: 'paper-english-derived',
  },
  {
    familyId: 'shopping-ordering',
    titleZh: '購物詢問、點餐與結帳',
    officialFunctionIds: ['cf-shopping-ordering-paying'],
    keyTargetPhrases: ['How much does this cost?', 'May I take your order?', 'Could we have the check, please?', 'Do you accept cards?'],
    typicalGenres: ['dialogue', 'schedule', 'notice'],
    dialogueScaffold: {
      initiatorRole: 'Customer',
      respondentRole: 'Clerk / Server',
      exampleTurn: 'A: How much is the whole-wheat flour? B: It is fifty dollars per kilogram.',
    },
    annotationSource: 'paper-english-derived',
  },
  {
    familyId: 'expressing-feelings-opinion',
    titleZh: '表達情緒感受與發表看法',
    officialFunctionIds: ['cf-expressing-feelings-opinions'],
    keyTargetPhrases: ['I feel proud because...', 'In my opinion...', 'I strongly believe that...', 'To be honest, I feel nervous'],
    typicalGenres: ['dialogue', 'narrative', 'article'],
    dialogueScaffold: {
      initiatorRole: 'Speaker A',
      respondentRole: 'Speaker B',
      exampleTurn: 'A: In my opinion, our defense was solid in the second half. B: I agree, everyone stayed alert.',
    },
    annotationSource: 'paper-english-derived',
  },
  {
    familyId: 'troubleshooting-inquiry',
    titleZh: '設備故障與任務排查',
    officialFunctionIds: ['cf-describing-problems-troubleshooting'],
    keyTargetPhrases: ['What seems to be the problem?', 'The red signal is blinking', 'Let’s check the wiring', 'It stopped working after...'],
    typicalGenres: ['dialogue', 'instructions', 'notice'],
    dialogueScaffold: {
      initiatorRole: 'Engineer A',
      respondentRole: 'Engineer B',
      exampleTurn: 'A: What seems to be wrong with the hopper? B: It stops moving items because the redstone line is locked.',
    },
    annotationSource: 'paper-english-derived',
  },
  {
    familyId: 'clarification-check',
    titleZh: '確認理解與請求重述',
    officialFunctionIds: ['cf-checking-understanding-clarification'],
    keyTargetPhrases: ['Pardon me?', 'Could you please repeat that?', 'Do you mean that we need three batteries?', 'Are we on the same page?'],
    typicalGenres: ['dialogue', 'instructions'],
    dialogueScaffold: {
      initiatorRole: 'Listener',
      respondentRole: 'Speaker',
      exampleTurn: 'A: Pardon? Did you say step two or step three? B: Step two, we need to calibrate the sensor first.',
    },
    annotationSource: 'paper-english-derived',
  },
  {
    familyId: 'plans-intentions',
    titleZh: '表達計畫與未來意圖',
    officialFunctionIds: ['cf-talking-about-plans-intentions'],
    keyTargetPhrases: ['I plan to...', 'We are going to...', 'My goal for this term is to...', 'Do you have any plans for...?'],
    typicalGenres: ['dialogue', 'schedule', 'article'],
    dialogueScaffold: {
      initiatorRole: 'Planner A',
      respondentRole: 'Planner B',
      exampleTurn: 'A: What are you planning to do after the exam? B: I am going to volunteer at the animal rescue shelter.',
    },
    annotationSource: 'paper-english-derived',
  },
]

export function getCommunicationFamily(familyId: string): CommunicationFamily | undefined {
  return communicationFamilies.find((f) => f.familyId === familyId)
}

export function findFamilyByOfficialFunctionId(officialFunctionId: string): CommunicationFamily | undefined {
  return communicationFamilies.find((f) => f.officialFunctionIds.includes(officialFunctionId))
}
