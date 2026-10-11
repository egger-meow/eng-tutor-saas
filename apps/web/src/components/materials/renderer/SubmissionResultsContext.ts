import { createContext } from 'react'
import type { SubmissionResult } from '../../../lib/student-material-api'

export const SubmissionResultsContext = createContext<SubmissionResult['results']>([])
