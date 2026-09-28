import { useCallback, useEffect, useState } from 'react'

export interface SpeechSynthesisHook {
  isSupported: boolean
  isSpeaking: boolean
  currentText: string | null
  speak: (text: string, lang?: string) => void
  stop: () => void
}

export function useSpeechSynthesis(): SpeechSynthesisHook {
  const [isSupported, setIsSupported] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentText, setCurrentText] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      setIsSupported(true)
    }
  }, [])

  const stop = useCallback(() => {
    if (!isSupported || typeof window === 'undefined') return
    try {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setCurrentText(null)
    } catch {
      // Ignore cancellation failures
    }
  }, [isSupported])

  const speak = useCallback(
    (text: string, lang = 'en-US') => {
      if (!isSupported || typeof window === 'undefined' || !text.trim()) return

      try {
        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(text.trim())
        utterance.lang = lang
        utterance.rate = 0.9 // slightly slower for language learners

        utterance.onstart = () => {
          setIsSpeaking(true)
          setCurrentText(text)
        }

        utterance.onend = () => {
          setIsSpeaking(false)
          setCurrentText(null)
        }

        utterance.onerror = () => {
          setIsSpeaking(false)
          setCurrentText(null)
        }

        window.speechSynthesis.speak(utterance)
      } catch {
        setIsSpeaking(false)
        setCurrentText(null)
      }
    },
    [isSupported],
  )

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel()
        } catch {
          // Ignore
        }
      }
    }
  }, [])

  return {
    isSupported,
    isSpeaking,
    currentText,
    speak,
    stop,
  }
}
