export type ReusableFieldDiversity = {
  accepted: boolean;
  totalCount: number;
  uniqueCount: number;
  uniqueRatio: number;
  maxFrequency: number;
  maxShare: number;
  topThreeShare: number;
  collisionRate: number;
  hasBlank: boolean;
};

/**
 * Reusable design principles are categories, not per-question identifiers.
 * Measure corpus concentration so legitimate recurrence is allowed while a
 * small set of boilerplate templates cannot dominate the analyses.
 */
export function analyzeReusableFieldDiversity(values: unknown[]): ReusableFieldDiversity {
  const counts = new Map<string, number>();
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  const totalCount = values.length;
  const frequencies = [...counts.values()].sort((a, b) => b - a);
  const uniqueCount = counts.size;
  const maxFrequency = frequencies[0] ?? 0;
  const pairDenominator = totalCount * Math.max(totalCount - 1, 1);
  const collisionRate = frequencies.reduce((sum, count) => sum + count * (count - 1), 0) / pairDenominator;
  const topThreeShare = frequencies.slice(0, 3).reduce((sum, count) => sum + count, 0) / Math.max(totalCount, 1);
  const uniqueRatio = uniqueCount / Math.max(totalCount, 1);
  const maxShare = maxFrequency / Math.max(totalCount, 1);
  const hasBlank = counts.has('');

  return {
    accepted:
      totalCount > 0 &&
      !hasBlank &&
      uniqueRatio >= 0.7 &&
      maxShare <= 0.05 &&
      topThreeShare <= 0.13 &&
      collisionRate <= 0.01,
    totalCount,
    uniqueCount,
    uniqueRatio,
    maxFrequency,
    maxShare,
    topThreeShare,
    collisionRate,
    hasBlank,
  };
}
