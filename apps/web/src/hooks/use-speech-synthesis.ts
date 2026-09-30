import { useCallback, useEffect, useRef, useState } from 'react'

let generation = 0
const listeners = new Set<(text: string | null) => void>()
function publish(text: string | null) { listeners.forEach((listener) => listener(text)) }

export function speechChunks(text: string): string[] {
  const words = text.trim().split(/\s+/)
  const chunks: string[] = []
  let chunk = ''
  for (const word of words) {
    if (chunk && chunk.length + word.length > 220) { chunks.push(chunk); chunk = '' }
    chunk += (chunk ? ' ' : '') + word
    if (/[.!?]$/.test(word)) { chunks.push(chunk); chunk = '' }
  }
  if (chunk) chunks.push(chunk)
  return chunks.filter(Boolean)
}

export function useSpeechSynthesis() {
  const [isSupported, setIsSupported] = useState(false)
  const [currentText, setCurrentText] = useState<string | null>(null)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceURI, setVoiceURI] = useState('')
  const [error, setError] = useState('')
  const ownedGeneration = useRef<number | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  useEffect(() => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return
    setIsSupported(true)
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((voice) => /^en\b/i.test(voice.lang)))
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    listeners.add(setCurrentText)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load)
      listeners.delete(setCurrentText)
      if (ownedGeneration.current === generation) {
        generation++
        window.speechSynthesis.cancel()
        publish(null)
      }
    }
  }, [])
  const stop = useCallback(() => {
    generation++
    window.speechSynthesis.cancel()
    publish(null)
  }, [])
  const speak = useCallback((text: string, lang = 'en-US') => {
    if (!isSupported || !text.trim()) return
    const token = ++generation
    ownedGeneration.current = token
    window.speechSynthesis.cancel()
    publish(text)
    setError('')
    const chunks = speechChunks(text)
    function next(index: number) {
      if (token !== generation) return
      if (index >= chunks.length) { publish(null); return }
      try {
        const utterance = new SpeechSynthesisUtterance(chunks[index])
        utteranceRef.current = utterance
        utterance.lang = lang
        utterance.rate = 0.9
        utterance.voice = voices.find((voice) => voice.voiceURI === voiceURI) ?? null
        utterance.onend = () => next(index + 1)
        utterance.onerror = () => {
          if (token !== generation) return
          publish(null)
          setError('裝置語音無法播放，請重試或選擇其他語音。')
        }
        window.speechSynthesis.speak(utterance)
      } catch {
        publish(null)
        setError('裝置語音無法播放，請稍後重試。')
      }
    }
    next(0)
  }, [isSupported, voices, voiceURI])
  return { isSupported, isSpeaking: currentText !== null, currentText, speak, stop, voices, voiceURI,
    setVoiceURI: (value: string) => { stop(); setVoiceURI(value) }, error }
}
