const DEFAULT_WORKLOAD_LOWER_PERCENT = 85
const DEFAULT_WORKLOAD_UPPER_PERCENT = 115
const WORKLOAD_EXCEPTION_LOWER_PERCENT = 75
const WORKLOAD_EXCEPTION_UPPER_PERCENT = 125
export const DEFAULT_WORKLOAD_LOWER_RATIO = DEFAULT_WORKLOAD_LOWER_PERCENT / 100
export const DEFAULT_WORKLOAD_UPPER_RATIO = DEFAULT_WORKLOAD_UPPER_PERCENT / 100
export const WORKLOAD_EXCEPTION_LOWER_RATIO = WORKLOAD_EXCEPTION_LOWER_PERCENT / 100
export const WORKLOAD_EXCEPTION_UPPER_RATIO = WORKLOAD_EXCEPTION_UPPER_PERCENT / 100
export const WORKLOAD_BUDGET_EXCEPTION_CHECK_ID = 'workload-budget-exception'

export type WorkloadFitCode = 'BUDGET_UNDERFILLED' | 'BUDGET_ALIGNED' | 'BUDGET_OVERFILLED'

export interface WorkloadFitResult {
  code: WorkloadFitCode
  targetMinutes: number
  estimatedMinutes: number
  minimumMinutes: number
  maximumMinutes: number
}

/** Compares truthful, content-derived workload with the learner's weekly capacity. */
export function evaluateWorkloadFit(targetMinutes: number, estimatedMinutes: number): WorkloadFitResult {
  if (!Number.isFinite(targetMinutes) || targetMinutes <= 0) {
    throw new RangeError('targetMinutes must be a positive finite number')
  }
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 0) {
    throw new RangeError('estimatedMinutes must be a non-negative finite number')
  }

  const minimumMinutes = Math.round((targetMinutes * DEFAULT_WORKLOAD_LOWER_PERCENT) / 100)
  const maximumMinutes = Math.round((targetMinutes * DEFAULT_WORKLOAD_UPPER_PERCENT) / 100)
  const code = estimatedMinutes < minimumMinutes
    ? 'BUDGET_UNDERFILLED'
    : estimatedMinutes > maximumMinutes
      ? 'BUDGET_OVERFILLED'
      : 'BUDGET_ALIGNED'

  return { code, targetMinutes, estimatedMinutes, minimumMinutes, maximumMinutes }
}

/** Exceptions can soften the normal fit band, but can never bypass this outer bound. */
export function isWithinWorkloadExceptionBand(targetMinutes: number, estimatedMinutes: number): boolean {
  if (!Number.isFinite(targetMinutes) || targetMinutes <= 0) {
    throw new RangeError('targetMinutes must be a positive finite number')
  }
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 0) {
    throw new RangeError('estimatedMinutes must be a non-negative finite number')
  }

  const minimumMinutes = Math.round((targetMinutes * WORKLOAD_EXCEPTION_LOWER_PERCENT) / 100)
  const maximumMinutes = Math.round((targetMinutes * WORKLOAD_EXCEPTION_UPPER_PERCENT) / 100)
  return estimatedMinutes >= minimumMinutes && estimatedMinutes <= maximumMinutes
}
