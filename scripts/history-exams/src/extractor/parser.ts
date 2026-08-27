import path from 'node:path';
import {
  EvidenceMode,
  ExtractedExam,
  ExtractedPassage,
  ExtractedQuestion,
  PassageGenre,
  QuestionOptions,
  QuestionSection,
  RequiredAsset,
  SubDocument,
} from '../schemas/extracted.ts';
import { getOfficialAnswer } from './official-answers.ts';
import { ExtractedPageText } from './pdf-reader.ts';

export interface ParseExamOptions {
  examId: string;
  sourcePdfPath: string;
}

export function parseExamFromPages(
  pages: ExtractedPageText[],
  options: ParseExamOptions
): ExtractedExam {
  const { examId, sourcePdfPath } = options;
  const year = parseInt(examId, 10);

  interface LineWithProvenance {
    text: string;
    pageNumber: number;
  }

  const allLines: LineWithProvenance[] = [];

  for (const page of pages) {
    if (page.pageNumber === 1) continue;

    for (const rawLine of page.lines) {
      // Clean hidden control characters (e.g. \u0014, \u0015, \u0016, \u0017 found in comics)
      const line = rawLine.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').trim();
      if (!line) continue;

      if (/^請翻頁繼續作答$/.test(line)) continue;
      if (/^試題結束$/.test(line)) continue;
      if (/^\d{1,2}$/.test(line)) continue;

      allLines.push({ text: line, pageNumber: page.pageNumber });
    }
  }

  let section1StartIdx = -1;
  let section2StartIdx = -1;
  let singleEndQuestion = 20;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i].text;
    const s1Match = line.match(/第一部分：單題.*?第\s*1\s*[-–]\s*(\d{1,2})\s*題/);
    if (s1Match) {
      section1StartIdx = i;
      singleEndQuestion = parseInt(s1Match[1], 10);
    }
    const s2Match = line.match(/第二部分：題組/);
    if (s2Match) {
      section2StartIdx = i;
    }
  }

  if (section1StartIdx === -1) {
    section1StartIdx = 0;
  }

  const singleLines = section2StartIdx !== -1
    ? allLines.slice(section1StartIdx, section2StartIdx)
    : allLines.slice(section1StartIdx);

  const passageSectionLines = section2StartIdx !== -1
    ? allLines.slice(section2StartIdx)
    : [];

  const questions: ExtractedQuestion[] = [];
  const passages: ExtractedPassage[] = [];

  // 1. Parse Section 1 (單題)
  const singleQuestions = parseSingleQuestions(singleLines, examId, singleEndQuestion);
  questions.push(...singleQuestions);

  // 2. Parse Section 2 (題組)
  if (passageSectionLines.length > 0) {
    const { extractedPassages, extractedQuestions } = parsePassageSection(
      passageSectionLines,
      examId,
      singleEndQuestion + 1,
      43
    );
    passages.push(...extractedPassages);
    questions.push(...extractedQuestions);
  }

  questions.sort((a, b) => a.questionNumber - b.questionNumber);

  return {
    examId,
    year,
    title: `${examId}年國中教育會考英語科試題`,
    sourcePdf: path.basename(sourcePdfPath),
    pageCount: pages.length,
    questionCount: questions.length,
    singleQuestionRange: [1, singleEndQuestion],
    passageQuestionRange: [singleEndQuestion + 1, 43],
    passages,
    questions,
    extractedAt: new Date().toISOString(),
    extractorVersion: '2.0.0-multimodal-hardened',
  };
}

function parseSingleQuestions(
  lines: Array<{ text: string; pageNumber: number }>,
  examId: string,
  endQuestionNum: number
): ExtractedQuestion[] {
  const questions: ExtractedQuestion[] = [];
  let currentNum: number | null = null;
  let currentLines: string[] = [];
  let currentPage = 2;

  const flushQuestion = () => {
    if (currentNum === null) return;
    const { stem, options, glossary } = splitStemAndOptions(currentLines);
    
    // Detect visual picture dependency
    const isPictureQuestion = /^Look at the picture/i.test(stem);
    const evidenceMode: EvidenceMode = isPictureQuestion ? 'visual_only' : 'text_only';
    const visualEvidenceRequired = isPictureQuestion;
    const requiredAssets: RequiredAsset[] = isPictureQuestion
      ? [
          {
            page: currentPage,
            role: 'single_image',
            imagePath: `history_exams/assets/${examId}/page-${currentPage}.png`,
            description: `Illustration for single question ${currentNum}`,
          },
        ]
      : [];

    const extractionConfidence = isPictureQuestion ? 'partial_visual_pending' : 'high';
    const extractionWarnings = isPictureQuestion
      ? [`Question ${currentNum} requires visual inspection of the picture on page ${currentPage}`]
      : [];

    questions.push({
      examId,
      questionNumber: currentNum,
      section: 'single',
      page: currentPage,
      passageId: null,
      passageRange: null,
      stem,
      options,
      answer: getOfficialAnswer(examId, currentNum),
      evidenceMode,
      visualEvidenceRequired,
      requiredAssets,
      glossary: Object.keys(glossary).length > 0 ? glossary : undefined,
      extractionConfidence,
      extractionWarnings,
    });
  };

  for (const { text, pageNumber } of lines) {
    if (/第一部分：單題/.test(text)) continue;

    const qMatch = text.match(/^(\d{1,2})\.\s*(.*)/);
    if (qMatch && parseInt(qMatch[1], 10) <= endQuestionNum) {
      flushQuestion();
      currentNum = parseInt(qMatch[1], 10);
      currentPage = pageNumber;
      currentLines = [qMatch[2]];
    } else if (currentNum !== null) {
      currentLines.push(text);
    }
  }

  flushQuestion();
  return questions;
}

function parsePassageSection(
  lines: Array<{ text: string; pageNumber: number }>,
  examId: string,
  startQuestionNum: number,
  endQuestionNum: number
): { extractedPassages: ExtractedPassage[]; extractedQuestions: ExtractedQuestion[] } {
  const extractedPassages: ExtractedPassage[] = [];
  const extractedQuestions: ExtractedQuestion[] = [];

  interface PassageBlock {
    range: [number, number];
    pageStart: number;
    pageEnd: number;
    lines: Array<{ text: string; pageNumber: number }>;
  }

  const blocks: PassageBlock[] = [];
  let currentBlock: PassageBlock | null = null;

  for (const line of lines) {
    if (/第二部分：題組/.test(line.text)) continue;

    const setHeaderMatch = line.text.match(/^[\(（]\s*(\d{1,2})\s*[-–~到至]\s*(\d{1,2})\s*[\)）]/);
    if (setHeaderMatch) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      const qStart = parseInt(setHeaderMatch[1], 10);
      const qEnd = parseInt(setHeaderMatch[2], 10);
      currentBlock = {
        range: [qStart, qEnd],
        pageStart: line.pageNumber,
        pageEnd: line.pageNumber,
        lines: [],
      };
      const afterHeader = line.text.replace(/^[\(（]\s*\d{1,2}\s*[-–~到至]\s*\d{1,2}\s*[\)）]/, '').trim();
      if (afterHeader) {
        currentBlock.lines.push({ text: afterHeader, pageNumber: line.pageNumber });
      }
      continue;
    }

    if (currentBlock) {
      currentBlock.lines.push(line);
      currentBlock.pageEnd = Math.max(currentBlock.pageEnd, line.pageNumber);
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  for (const block of blocks) {
    const passageId = `${examId}-p${block.range[0]}-${block.range[1]}`;
    const questionNumbers = Array.from(
      { length: block.range[1] - block.range[0] + 1 },
      (_, i) => block.range[0] + i
    );

    const isCloze = checkIsClozeBlock(block.lines, block.range[0]);

    if (isCloze) {
      const { passage, questions } = parseClozeBlock(block, examId, passageId, questionNumbers);
      extractedPassages.push(passage);
      extractedQuestions.push(...questions);
    } else {
      const { passage, questions } = parseReadingComprehensionBlock(
        block,
        examId,
        passageId,
        questionNumbers
      );
      extractedPassages.push(passage);
      extractedQuestions.push(...questions);
    }
  }

  return { extractedPassages, extractedQuestions };
}

function checkIsClozeBlock(
  lines: Array<{ text: string; pageNumber: number }>,
  firstQuestionNum: number
): boolean {
  for (const l of lines) {
    if (l.text.startsWith(`${firstQuestionNum}.`)) {
      const isOptionPattern = /\([A-D]\)/.test(l.text);
      const isClozeFormat = /^\d{1,2}\.\s*(\([A-D]\)|[A-D]\b)/.test(l.text.trim()) ||
        (/^\d{1,2}\.\s*\(A\)/.test(l.text.trim()) && !/\?$/.test(l.text.trim()));
      if (isOptionPattern && isClozeFormat) {
        return true;
      }
    }
  }
  return false;
}

function parseClozeBlock(
  block: { range: [number, number]; pageStart: number; pageEnd: number; lines: Array<{ text: string; pageNumber: number }> },
  examId: string,
  passageId: string,
  questionNumbers: number[]
): { passage: ExtractedPassage; questions: ExtractedQuestion[] } {
  const passageLines: string[] = [];
  const questionMap: Record<number, { lines: string[]; page: number }> = {};
  let currentQNum: number | null = null;
  const glossary: Record<string, string> = {};

  for (const { text, pageNumber } of block.lines) {
    if (text.includes('')) {
      const parsedGlossary = parseGlossaryString(text);
      Object.assign(glossary, parsedGlossary);
      continue;
    }

    const qStartMatch = text.match(/^(\d{1,2})\.\s*(.*)/);
    if (qStartMatch && questionNumbers.includes(parseInt(qStartMatch[1], 10))) {
      currentQNum = parseInt(qStartMatch[1], 10);
      questionMap[currentQNum] = {
        lines: [qStartMatch[2]],
        page: pageNumber,
      };
      continue;
    }

    if (currentQNum !== null) {
      questionMap[currentQNum].lines.push(text);
    } else {
      passageLines.push(text);
    }
  }

  const passageText = passageLines.join('\n').trim();
  const passage: ExtractedPassage = {
    id: passageId,
    examId,
    questionRange: block.range,
    genre: 'cloze_passage',
    title: null,
    text: passageText,
    evidenceMode: 'text_only',
    visualEvidenceRequired: false,
    requiredAssets: [],
    glossary: Object.keys(glossary).length > 0 ? glossary : undefined,
    pageStart: block.pageStart,
    pageEnd: block.pageEnd,
    questionNumbers,
  };

  const questions: ExtractedQuestion[] = [];
  for (const qNum of questionNumbers) {
    const qData = questionMap[qNum] || { lines: [], page: block.pageStart };
    const { stem, options } = splitStemAndOptions(qData.lines);

    questions.push({
      examId,
      questionNumber: qNum,
      section: 'cloze',
      page: qData.page,
      passageId,
      passageRange: block.range,
      stem: stem || `(Cloze blank ${qNum})`,
      options,
      answer: getOfficialAnswer(examId, qNum),
      evidenceMode: 'text_only',
      visualEvidenceRequired: false,
      requiredAssets: [],
      extractionConfidence: 'high',
      extractionWarnings: [],
    });
  }

  return { passage, questions };
}

function parseReadingComprehensionBlock(
  block: { range: [number, number]; pageStart: number; pageEnd: number; lines: Array<{ text: string; pageNumber: number }> },
  examId: string,
  passageId: string,
  questionNumbers: number[]
): { passage: ExtractedPassage; questions: ExtractedQuestion[] } {
  const passageLines: string[] = [];
  const questionMap: Record<number, { lines: string[]; page: number }> = {};
  let currentQNum: number | null = null;
  const glossary: Record<string, string> = {};

  for (const { text, pageNumber } of block.lines) {
    if (text.includes('')) {
      const parsedGlossary = parseGlossaryString(text);
      Object.assign(glossary, parsedGlossary);
      continue;
    }

    const qStartMatch = text.match(/^(\d{1,2})\.\s*(.*)/);
    if (qStartMatch && questionNumbers.includes(parseInt(qStartMatch[1], 10))) {
      currentQNum = parseInt(qStartMatch[1], 10);
      questionMap[currentQNum] = {
        lines: [qStartMatch[2]],
        page: pageNumber,
      };
      continue;
    }

    if (currentQNum !== null) {
      questionMap[currentQNum].lines.push(text);
    } else {
      passageLines.push(text);
    }
  }

  let passageText = passageLines.join('\n').trim();

  // Detect specific genre, multimodal requirements, and dual documents
  const { genre, evidenceMode, visualEvidenceRequired, requiredAssets, subDocuments, title } =
    analyzePassageSemantics(passageText, block, examId, passageId);

  // If infographic or comic had zero plain text, supply clear content descriptor
  if (!passageText) {
    passageText = `[Visual/Graphic Content in Source PDF: ${genre} on page ${block.pageStart}]`;
  }

  const passage: ExtractedPassage = {
    id: passageId,
    examId,
    questionRange: block.range,
    genre,
    title,
    text: passageText,
    evidenceMode,
    visualEvidenceRequired,
    requiredAssets,
    glossary: Object.keys(glossary).length > 0 ? glossary : undefined,
    subDocuments: subDocuments && subDocuments.length > 0 ? subDocuments : undefined,
    pageStart: block.pageStart,
    pageEnd: block.pageEnd,
    questionNumbers,
  };

  const questions: ExtractedQuestion[] = [];
  for (const qNum of questionNumbers) {
    const qData = questionMap[qNum] || { lines: [], page: block.pageStart };
    const { stem, options, glossary: qGlossary } = splitStemAndOptions(qData.lines);

    // Determine per-question evidence mode
    let qEvidenceMode: EvidenceMode = evidenceMode;
    let qVisualRequired = visualEvidenceRequired;
    const qRequiredAssets: RequiredAsset[] = [...requiredAssets];
    const qWarnings: string[] = [];

    // Spatial item detection (e.g. 115 Q26 navigation map, 111 Q22 location)
    if (/map|direction|walk|route|look at the.*map|how.*get to/i.test(stem) || passageId === '115-p24-26' && qNum === 26) {
      qEvidenceMode = 'spatial';
      qVisualRequired = true;
    } else if (subDocuments && subDocuments.length > 1) {
      if (/both|compare|difference|differ|disagree|agree/i.test(stem) || qNum >= 38) {
        qEvidenceMode = 'multi_document';
      }
    } else if (/look at the.*picture|diagram/i.test(stem) || options.A.includes('[Image/Diagram')) {
      qEvidenceMode = 'visual_only';
      qVisualRequired = true;
    }

    const extractionConfidence = qVisualRequired ? 'partial_visual_pending' : 'high';
    if (qVisualRequired) {
      const qPage = qData.page || block.pageStart;
      if (qRequiredAssets.length === 0) {
        qRequiredAssets.push({
          page: qPage,
          role: 'diagram',
          imagePath: `history_exams/assets/${examId}/page-${qPage}.png`,
          description: `Visual evidence for question ${qNum} on page ${qPage}`,
        });
      }
      qWarnings.push(`Question ${qNum} requires visual evidence from page ${qPage}`);
    }

    questions.push({
      examId,
      questionNumber: qNum,
      section: 'passage_comprehension',
      page: qData.page,
      passageId,
      passageRange: block.range,
      stem: stem || `(Comprehension question ${qNum})`,
      options,
      answer: getOfficialAnswer(examId, qNum),
      evidenceMode: qEvidenceMode,
      visualEvidenceRequired: qVisualRequired,
      requiredAssets: qRequiredAssets,
      glossary: Object.keys(qGlossary).length > 0 ? qGlossary : undefined,
      extractionConfidence,
      extractionWarnings: qWarnings,
    });
  }

  return { passage, questions };
}

function analyzePassageSemantics(
  text: string,
  block: { range: [number, number]; pageStart: number; pageEnd: number },
  examId: string,
  passageId: string
): {
  genre: PassageGenre;
  evidenceMode: EvidenceMode;
  visualEvidenceRequired: boolean;
  requiredAssets: RequiredAsset[];
  subDocuments?: SubDocument[];
  title: string | null;
} {
  const assets: RequiredAsset[] = [];
  for (let p = block.pageStart; p <= block.pageEnd; p++) {
    assets.push({
      page: p,
      role: 'full_page',
      imagePath: `history_exams/assets/${examId}/page-${p}.png`,
    });
  }

  // 1. Dual Document Article (e.g. 115 Q35–39 Icelandic: "The Future of Icelandic" & "Our Future with Icelandic")
  if (text.includes('The Future of Icelandic') || text.includes('Our Future with Icelandic')) {
    const subDocs: SubDocument[] = [
      {
        title: 'The Future of Icelandic',
        author: 'Anna Adams',
        text: extractSubDocText(text, 'The Future of Icelandic', 'Our Future with Icelandic'),
      },
      {
        title: 'Our Future with Icelandic',
        author: 'Gunnar Eggertsson',
        text: extractSubDocText(text, 'Our Future with Icelandic', null),
      },
    ];
    return {
      genre: 'multi_document_comparison',
      evidenceMode: 'multi_document',
      visualEvidenceRequired: false,
      requiredAssets: assets,
      subDocuments: subDocs,
      title: 'Debate on the Future of Icelandic',
    };
  }

  // 2. Comic Strips (e.g. 115 Q22–23 Hawkins, 114 Q22–23)
  if (passageId === '115-p22-23' || /comic|panel|hawkins/i.test(text) && block.range[1] - block.range[0] <= 2) {
    return {
      genre: 'comic_strip',
      evidenceMode: 'text_visual',
      visualEvidenceRequired: true,
      requiredAssets: [
        {
          page: block.pageStart,
          role: 'comic',
          imagePath: `history_exams/assets/${examId}/page-${block.pageStart}.png`,
          description: '4-panel comic strip dialogue and visual narrative',
        },
      ],
      title: 'Hawkins Comic Strip',
    };
  }

  // 3. Brochure / Map & Rules (e.g. 115 Q24–26 Marigolds' Home)
  if (/Marigolds.*Home|brochure/i.test(text) || passageId === '115-p24-26') {
    return {
      genre: 'brochure_flyer',
      evidenceMode: 'spatial',
      visualEvidenceRequired: true,
      requiredAssets: [
        {
          page: block.pageStart,
          role: 'map',
          imagePath: `history_exams/assets/${examId}/page-${block.pageStart}.png`,
          description: "Marigolds' Home map layout, opening hours, and visitor rules",
        },
      ],
      title: "The Marigolds' Home Brochure & Map",
    };
  }

  // 4. Infographic Recipes / Process / Flowcharts (e.g. 115 Q20–21 Fruit Tea, 115 Q32–34 Sea Glass, 111 Q21–22)
  if (/Fruit Tea|Sea Glass|infographic|step \d|procedure/i.test(text) || passageId === '115-p20-21' || passageId === '115-p32-34' || passageId === '111-p21-22') {
    const isFruitTea = /Fruit Tea/i.test(text) || passageId === '115-p20-21';
    return {
      genre: 'infographic_chart_table',
      evidenceMode: 'text_visual',
      visualEvidenceRequired: true,
      requiredAssets: [
        {
          page: block.pageStart,
          role: 'infographic',
          imagePath: `history_exams/assets/${examId}/page-${block.pageStart}.png`,
          description: isFruitTea ? 'Fruit tea recipe ingredients and preparation chart' : 'Process infographic and diagram',
        },
      ],
      title: isFruitTea ? 'The Best Fruit Tea You Can Make at Home' : 'Infographic Guide',
    };
  }

  // 5. Dialogue
  if (/^[A-Z][a-z]+:\s+/m.test(text)) {
    return {
      genre: 'dialogue',
      evidenceMode: 'text_only',
      visualEvidenceRequired: false,
      requiredAssets: [],
      title: null,
    };
  }

  // 6. Notice / Announcement
  if (/NOTICE|ANNOUNCEMENT|Dear Residents|Attention|Dear Guests/i.test(text)) {
    return {
      genre: 'notice_announcement',
      evidenceMode: 'text_only',
      visualEvidenceRequired: false,
      requiredAssets: [],
      title: null,
    };
  }

  // 7. Standard Article / Narrative
  return {
    genre: 'article_informational',
    evidenceMode: 'text_only',
    visualEvidenceRequired: false,
    requiredAssets: [],
    title: null,
  };
}

function extractSubDocText(fullText: string, startMarker: string, endMarker: string | null): string {
  const startIdx = fullText.indexOf(startMarker);
  if (startIdx === -1) return fullText;
  const slice = fullText.slice(startIdx);
  if (endMarker) {
    const endIdx = slice.indexOf(endMarker);
    if (endIdx !== -1) {
      return slice.slice(0, endIdx).trim();
    }
  }
  return slice.trim();
}

function splitStemAndOptions(lines: string[]): {
  stem: string;
  options: QuestionOptions;
  glossary: Record<string, string>;
} {
  const fullText = lines.join(' ').replace(/\s+/g, ' ').trim();
  const glossary: Record<string, string> = {};

  let textWithoutGlossary = fullText;
  if (fullText.includes('')) {
    const parts = fullText.split('');
    textWithoutGlossary = parts[0].trim();
    if (parts[1]) {
      Object.assign(glossary, parseGlossaryString(' ' + parts[1]));
    }
  }

  const { stem, options } = extractOptionsFromText(textWithoutGlossary);
  return { stem, options, glossary };
}

function extractOptionsFromText(text: string): { stem: string; options: QuestionOptions } {
  const match = text.match(/(.*?)\(A\)(.*?)\(B\)(.*?)\(C\)(.*?)\(D\)(.*)/);
  if (match) {
    return {
      stem: match[1].trim(),
      options: {
        A: match[2].trim() || '[Image/Diagram Option A]',
        B: match[3].trim() || '[Image/Diagram Option B]',
        C: match[4].trim() || '[Image/Diagram Option C]',
        D: match[5].trim() || '[Image/Diagram Option D]',
      },
    };
  }

  // Try flexible pattern
  const optAMatch = text.indexOf('(A)');
  const optBMatch = text.indexOf('(B)');
  const optCMatch = text.indexOf('(C)');
  const optDMatch = text.indexOf('(D)');

  if (optAMatch !== -1 && optBMatch !== -1 && optCMatch !== -1 && optDMatch !== -1) {
    const stem = text.slice(0, optAMatch).trim();
    const optA = text.slice(optAMatch + 3, optBMatch).trim();
    const optB = text.slice(optBMatch + 3, optCMatch).trim();
    const optC = text.slice(optCMatch + 3, optDMatch).trim();
    const optD = text.slice(optDMatch + 3).trim();
    return {
      stem,
      options: {
        A: optA || '[Image/Diagram Option A]',
        B: optB || '[Image/Diagram Option B]',
        C: optC || '[Image/Diagram Option C]',
        D: optD || '[Image/Diagram Option D]',
      },
    };
  }

  return {
    stem: text,
    options: {
      A: '[Option A]',
      B: '[Option B]',
      C: '[Option C]',
      D: '[Option D]',
    },
  };
}

function parseGlossaryString(glossaryText: string): Record<string, string> {
  const clean = glossaryText.replace(//g, '').trim();
  const pairs: Record<string, string> = {};
  
  // Match English words followed by Chinese explanation
  const regex = /([a-zA-Z\s\-’']+)\s+([\u4e00-\u9fa5\w\s，、]+?)(?=(?:[a-zA-Z\s\-’']+\s+[\u4e00-\u9fa5]|$))/g;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(clean)) !== null) {
    const key = m[1].trim();
    const val = m[2].trim();
    if (key && val) {
      pairs[key] = val;
    }
  }

  // Fallback simple whitespace split if regex found nothing
  if (Object.keys(pairs).length === 0 && clean) {
    const tokens = clean.split(/\s+/);
    if (tokens.length >= 2) {
      pairs[tokens[0]] = tokens.slice(1).join(' ');
    }
  }

  return pairs;
}
