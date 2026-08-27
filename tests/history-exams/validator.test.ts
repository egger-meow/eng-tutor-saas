import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateFullCorpus } from '../../scripts/history-exams/src/validator';

describe('Historical CAP English Exam Corpus Validator', () => {
  const extractedDir = path.resolve(__dirname, '../../history_exams/extracted');
  const analyzedDir = path.resolve(__dirname, '../../history_exams/analyzed');
  const knowledgeDir = path.resolve(__dirname, '../../history_exams/knowledge');
  const benchmarkDir = path.resolve(__dirname, '../../history_exams/benchmark');

  it('validates the complete 4-stage historical exam corpus', () => {
    const report = validateFullCorpus({
      extractedDir,
      analyzedDir,
      knowledgeDir,
      benchmarkDir,
    });

    expect(report.valid).toBe(true);
    expect(report.structurallyValid).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.extractedExamsCount).toBe(5);
    expect(report.analyzedExamsCount).toBe(5);
    expect(report.knowledgeArtifactsCount).toBe(7);
    expect(report.benchmarkValid).toBe(true);
    // In provisional offline mock environment, authorityEligible is false with clear blockers
    if (report.authorityBlockers.length > 0) {
      expect(report.authorityEligible).toBe(false);
      expect(report.authorityStatus).toBe('provisional');
    }
  });

  it('flags errors when directories are missing or corrupted', () => {
    const report = validateFullCorpus({
      extractedDir: path.resolve(__dirname, 'non-existent-extracted'),
      analyzedDir,
      knowledgeDir,
      benchmarkDir,
    });

    expect(report.valid).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
  });
});
