import path from 'node:path';
import {
  ExtractedExam,
  ExtractedPassage,
  ExtractedQuestion,
  PassageGenre,
  QuestionOptions,
  QuestionSection,
} from '../schemas/extracted.ts';
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

  // Clean lines across pages, preserving page provenance
  interface LineWithProvenance {
    text: string;
    pageNumber: number;
  }

  const allLines: LineWithProvenance[] = [];

  for (const page of pages) {
    // Skip cover page (Page 1)
    if (page.pageNumber === 1) continue;

    for (const rawLine of page.lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Filter out footer instructions and standalone page numbers
      if (/^請翻頁繼續作答$/.test(line)) continue;
      if (/^試題結束$/.test(line)) continue;
      if (/^\d{1,2}$/.test(line)) continue; // Standalone page numbers

      allLines.push({ text: line, pageNumber: page.pageNumber });
    }
  }

  // Identify Section 1 and Section 2 boundaries
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

  // Sort questions by questionNumber
  questions.sort((a, b) => a.questionNumber - b.questionNumber);

  return {
    examId,
    year,
    title: `${year} 年國中教育會考英語科閱讀試題`,
    sourcePdf: path.basename(sourcePdfPath),
    pageCount: pages.length,
    questionCount: questions.length,
    singleQuestionRange: [1, singleEndQuestion],
    passageQuestionRange: [singleEndQuestion + 1, 43],
    passages,
    questions,
    extractedAt: new Date().toISOString(),
    extractorVersion: '1.0.0',
  };
}

/**
 * Parses Single Questions (第一部分：單題)
 */
function parseSingleQuestions(
  lines: Array<{ text: string; pageNumber: number }>,
  examId: string,
  expectedCount: number
): ExtractedQuestion[] {
  const questions: ExtractedQuestion[] = [];

  // Group lines by question number starting with "N. "
  interface QuestionChunk {
    questionNumber: number;
    lines: Array<{ text: string; pageNumber: number }>;
  }

  const chunks: QuestionChunk[] = [];
  let currentChunk: QuestionChunk | null = null;

  for (const item of lines) {
    const qMatch = item.text.match(/^(\d{1,2})\.\s*(.*)$/);
    if (qMatch) {
      const qNum = parseInt(qMatch[1], 10);
      if (qNum <= expectedCount) {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = {
          questionNumber: qNum,
          lines: [{ text: qMatch[2] ? `${qNum}. ${qMatch[2]}` : item.text, pageNumber: item.pageNumber }],
        };
        continue;
      }
    }

    if (currentChunk) {
      currentChunk.lines.push(item);
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  for (const chunk of chunks) {
    const parsed = parseQuestionItem(chunk.lines, examId, chunk.questionNumber, 'single', null, null);
    questions.push(parsed);
  }

  return questions;
}

/**
 * Parses Section 2 (第二部分：題組) containing multiple passage clusters
 */
function parsePassageSection(
  lines: Array<{ text: string; pageNumber: number }>,
  examId: string,
  startQ: number,
  endQ: number
): { extractedPassages: ExtractedPassage[]; extractedQuestions: ExtractedQuestion[] } {
  const extractedPassages: ExtractedPassage[] = [];
  const extractedQuestions: ExtractedQuestion[] = [];

  // Detect clusters marked with (start-end) like (21-22), (23-25), (38-43)
  interface PassageCluster {
    range: [number, number];
    lines: Array<{ text: string; pageNumber: number }>;
  }

  const clusters: PassageCluster[] = [];
  let currentCluster: PassageCluster | null = null;

  for (const item of lines) {
    const rangeMatch = item.text.match(/^\s*\(?\s*(\d{1,2})\s*[-–~到至]\s*(\d{1,2})\s*\)?\s*$/);
    if (rangeMatch) {
      const qStart = parseInt(rangeMatch[1], 10);
      const qEnd = parseInt(rangeMatch[2], 10);
      if (qStart >= startQ && qEnd <= endQ) {
        if (currentCluster) {
          clusters.push(currentCluster);
        }
        currentCluster = {
          range: [qStart, qEnd],
          lines: [],
        };
        continue;
      }
    }

    if (currentCluster) {
      currentCluster.lines.push(item);
    }
  }

  if (currentCluster) {
    clusters.push(currentCluster);
  }

  // For each passage cluster, separate the passage text from the questions
  for (const cluster of clusters) {
    const [qStart, qEnd] = cluster.range;
    const passageId = `${examId}-p${qStart}-${qEnd}`;
    const questionNumbers = Array.from({ length: qEnd - qStart + 1 }, (_, i) => qStart + i);

    // Find the lines belonging to questions vs passage
    // Questions start with e.g. "21. ", "22. " or for cloze "38. (A)..."
    const passageLines: Array<{ text: string; pageNumber: number }> = [];
    const questionLineBuckets: Map<number, Array<{ text: string; pageNumber: number }>> = new Map();
    questionNumbers.forEach((n) => questionLineBuckets.set(n, []));

    let activeQNum: number | null = null;

    for (const item of cluster.lines) {
      // Check if line starts a question in this cluster
      const qMatch = item.text.match(/^(\d{1,2})\.\s*(.*)$/);
      if (qMatch) {
        const num = parseInt(qMatch[1], 10);
        if (num >= qStart && num <= qEnd) {
          activeQNum = num;
          questionLineBuckets.get(num)?.push(item);
          continue;
        }
      }

      if (activeQNum !== null) {
        questionLineBuckets.get(activeQNum)?.push(item);
      } else {
        passageLines.push(item);
      }
    }

    // Extract glossary footnotes from passageLines or questionLines
    const glossary: Record<string, string> = {};
    const cleanPassageLines: string[] = [];

    for (const pl of passageLines) {
      const glossMatch = pl.text.match(/^[\uF026\u2002]\s*(.*)$/);
      if (glossMatch) {
        parseGlossaryEntries(glossMatch[1], glossary);
      } else {
        cleanPassageLines.push(pl.text);
      }
    }

    const cleanText = cleanPassageLines.join('\n').trim();
    const isVisualPassage = cleanText.length === 0;
    const passageText = isVisualPassage ? '[Visual/Graphic/Infographic Context in Source PDF]' : cleanText;
    const pageStart = cluster.lines[0]?.pageNumber || 1;
    const pageEnd = cluster.lines[cluster.lines.length - 1]?.pageNumber || pageStart;

    // Detect genre and if it's cloze
    const isCloze = detectIsCloze(passageText, questionNumbers);
    const genre = isVisualPassage ? 'infographic_chart_table' : inferPassageGenre(passageText, isCloze);

    extractedPassages.push({
      id: passageId,
      examId,
      questionRange: [qStart, qEnd],
      genre,
      title: null,
      text: passageText,
      glossary: Object.keys(glossary).length > 0 ? glossary : undefined,
      pageStart,
      pageEnd,
      questionNumbers,
    });

    // Parse each question in the cluster
    for (const qNum of questionNumbers) {
      const qLines = questionLineBuckets.get(qNum) || [];
      const section: QuestionSection = isCloze ? 'cloze' : 'passage_comprehension';
      const qObj = parseQuestionItem(
        qLines,
        examId,
        qNum,
        section,
        passageId,
        [qStart, qEnd]
      );
      extractedQuestions.push(qObj);
    }
  }

  return { extractedPassages, extractedQuestions };
}

/**
 * Extracts glossary footnote entries like "stir 攪拌" or "Icelander 冰島人 product 商品"
 */
function parseGlossaryEntries(text: string, target: Record<string, string>): void {
  const parts = text.split(/\s{2,}/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([A-Za-z\-\s]+)\s+([\u4e00-\u9fa5\w\s]+)$/);
    if (match) {
      target[match[1].trim()] = match[2].trim();
    } else {
      const tokens = trimmed.split(/\s+/);
      if (tokens.length >= 2) {
        target[tokens[0]] = tokens.slice(1).join(' ');
      }
    }
  }
}

/**
 * Detects if a passage is a cloze test (has numbered blanks matching question numbers)
 */
function detectIsCloze(text: string, questionNumbers: number[]): boolean {
  let count = 0;
  for (const num of questionNumbers) {
    const pattern = new RegExp(`(?:\\s|^|__)${num}(?:\\s|__|\\.|,|$)`);
    if (pattern.test(text)) {
      count++;
    }
  }
  return count >= Math.floor(questionNumbers.length / 2);
}

/**
 * Heuristically infers passage genre based on format, markers, and text structure
 */
function inferPassageGenre(text: string, isCloze: boolean): PassageGenre {
  if (isCloze) return 'cloze_passage';
  if (/Opening times|Admission|Tickets|Notice|Announcement|Dear|Attention|Rules/i.test(text)) {
    if (/Opening times|Tickets|brochure|museum|schedule|tour/i.test(text)) {
      return 'brochure_flyer';
    }
    return 'notice_announcement';
  }
  if (/(?:^[A-Z][a-z]+:)|(?:said|asked|replied)/m.test(text) && text.includes(':')) {
    return 'dialogue';
  }
  if (/Dear\s+[A-Z]|Best regards|Sincerely|Subject:|From:|To:/i.test(text)) {
    return 'letter_email';
  }
  if (/Table|Chart|Graph|Percent|%|Year\s+19|Year\s+20/i.test(text) && /\d+%\s+|\$\d+/.test(text)) {
    return 'infographic_chart_table';
  }
  if (/Once upon a time|One day|When I was|Years ago|In the 1970s|A long time ago/i.test(text)) {
    return 'narrative';
  }
  return 'article_informational';
}

/**
 * Parses question stem, options (A, B, C, D), footnotes, and page provenance
 */
function parseQuestionItem(
  lines: Array<{ text: string; pageNumber: number }>,
  examId: string,
  questionNumber: number,
  section: QuestionSection,
  passageId: string | null,
  passageRange: [number, number] | null
): ExtractedQuestion {
  const page = lines[0]?.pageNumber || 1;
  const glossary: Record<string, string> = {};
  const cleanLines: string[] = [];

  for (const l of lines) {
    const glossMatch = l.text.match(/^[\uF026\u2002]\s*(.*)$/);
    if (glossMatch) {
      parseGlossaryEntries(glossMatch[1], glossary);
    } else {
      cleanLines.push(l.text);
    }
  }

  const questionJoined = cleanLines.join(' ').trim();

  // Extract options (A), (B), (C), (D)
  const options = extractOptions(questionJoined);

  // Extract stem: everything before (A)
  let stem = '';
  const optAIndex = questionJoined.indexOf('(A)');
  if (optAIndex !== -1) {
    stem = questionJoined.slice(0, optAIndex).trim();
  } else {
    stem = questionJoined.trim();
  }

  // Clean leading "N. " from stem
  const stemClean = stem.replace(new RegExp(`^${questionNumber}\\.\\s*`), '').trim();

  const warnings: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'high';

  if (!options.A || !options.B || !options.C || !options.D) {
    warnings.push('Incomplete options extracted');
    confidence = 'medium';
  }

  if (!stemClean && section !== 'cloze') {
    warnings.push('Empty question stem');
    confidence = 'low';
  }

  return {
    examId,
    questionNumber,
    section,
    page,
    passageId: passageId ?? null,
    passageRange: passageRange ?? null,
    stem: stemClean || `Question ${questionNumber}`,
    options,
    answer: null, // Strictly null: official answer keys are not in student question PDFs
    glossary: Object.keys(glossary).length > 0 ? glossary : undefined,
    extractionConfidence: confidence,
    extractionWarnings: warnings,
  };
}

/**
 * Extracts options (A), (B), (C), (D) from text using regex boundary matching
 */
function extractOptions(text: string): QuestionOptions {
  const aIdx = text.indexOf('(A)');
  const bIdx = text.indexOf('(B)');
  const cIdx = text.indexOf('(C)');
  const dIdx = text.indexOf('(D)');

  if (aIdx === -1 || bIdx === -1 || cIdx === -1 || dIdx === -1) {
    // Fallback: try regex
    const optMatch = text.match(/\(A\)\s*(.*?)\s*\(B\)\s*(.*?)\s*\(C\)\s*(.*?)\s*\(D\)\s*(.*)$/);
    if (optMatch) {
      return {
        A: optMatch[1].trim() || '[Image/Diagram Option A]',
        B: optMatch[2].trim() || '[Image/Diagram Option B]',
        C: optMatch[3].trim() || '[Image/Diagram Option C]',
        D: optMatch[4].trim() || '[Image/Diagram Option D]',
      };
    }
    return {
      A: '[Image/Diagram Option A]',
      B: '[Image/Diagram Option B]',
      C: '[Image/Diagram Option C]',
      D: '[Image/Diagram Option D]',
    };
  }

  const optA = text.slice(aIdx + 3, bIdx).trim();
  const optB = text.slice(bIdx + 3, cIdx).trim();
  const optC = text.slice(cIdx + 3, dIdx).trim();
  const optD = text.slice(dIdx + 3).trim();

  return {
    A: optA || '[Image/Diagram Option A]',
    B: optB || '[Image/Diagram Option B]',
    C: optC || '[Image/Diagram Option C]',
    D: optD || '[Image/Diagram Option D]',
  };
}
