export interface CapPrecedentAuditInput {
  capTransferQuestionCount: number
  precedentRefs: string[]
  availableRefs: ReadonlySet<string>
}

export interface CapPrecedentAuditResult { passed: boolean; findings: string[] }

/** Deterministic production quality floor; prompt-level relevance/depth critique remains independent. */
export function auditCapPrecedentFloor(input: CapPrecedentAuditInput): CapPrecedentAuditResult {
  const findings: string[] = []
  if (input.capTransferQuestionCount > 0 && input.precedentRefs.length === 0) {
    findings.push('CAP_PRECEDENT_MISSING: cap-transfer assessment started without an internal precedent reference')
  }
  const invalid = input.precedentRefs.filter((ref) => !/^cap-[a-f0-9]{12}$/.test(ref) || !input.availableRefs.has(ref))
  if (invalid.length > 0) findings.push(`CAP_PRECEDENT_UNKNOWN: ${[...new Set(invalid)].join(', ')}`)
  return { passed: findings.length === 0, findings }
}
