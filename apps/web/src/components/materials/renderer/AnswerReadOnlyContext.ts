import { createContext, useContext } from 'react'

export const AnswerReadOnlyContext = createContext(false)
export const useAnswerReadOnly = () => useContext(AnswerReadOnlyContext)
