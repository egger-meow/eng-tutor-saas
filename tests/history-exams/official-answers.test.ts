import { describe, expect, it } from 'vitest';
import { getOfficialAnswer } from '../../scripts/history-exams/src/extractor/official-answers';

/**
 * Verified against the published CAP reference-answer tables.
 * The table layout changes after English listening (Q21), mathematics (Q25),
 * and Chinese (Q42) end, so the English-reading column must be tracked by
 * subject rather than by a fixed visual column index.
 */
const VERIFIED_ENGLISH_READING_KEYS: Record<string, string> = {
  '111': 'AACCBABBAD CBDCBCDCAD CCDCACADBD ADDBDBCBAD CAA'.replace(/\s/g, ''),
  '112': 'BDDBABACCD DCCCDCCBDC ABD BBAACDB AADCB DDBBCBAA'.replace(/\s/g, ''),
  '113': 'ACBBDDBDCD CAAACDCDAC B DCCBADBBA DAABAB BCCABBD'.replace(/\s/g, ''),
  '114': 'DDCBDAABDC ADDAADBABB BACDCCADCD BDABCCCBCCABA'.replace(/\s/g, ''),
  '115': 'BABCCD CACACADDAADBDC'.replace(/\s/g, '') + 'DDBDDCDC AABDC AABBCBBBB C'.replace(/\s/g, ''),
};

describe('Official CAP English reading answer keys', () => {
  it.each(['111', '112', '113', '114', '115'])('matches all 43 published answers for %s', (examId) => {
    const expected = VERIFIED_ENGLISH_READING_KEYS[examId];
    expect(expected).toHaveLength(43);

    const actual = Array.from({ length: 43 }, (_, index) => getOfficialAnswer(examId, index + 1)).join('');
    expect(actual).toBe(expected);
  });
});