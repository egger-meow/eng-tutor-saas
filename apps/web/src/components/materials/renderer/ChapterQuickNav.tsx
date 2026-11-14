import { useEffect, useState, type RefObject } from 'react'
import type { StudentLesson } from '../../../types/student-material'

/** Keeps the long lesson reachable without pinning the full editing toolbar. */
export function ChapterQuickNav({ lesson, toolbarRef, completionRef, onJump }: {
  lesson: StudentLesson
  toolbarRef: RefObject<HTMLElement | null>
  completionRef: RefObject<HTMLElement | null>
  onJump: (chapterId: string) => void
}) {
  const [visible, setVisible] = useState(false)
  const [atCompletion, setAtCompletion] = useState(false)
  useEffect(() => {
    if (!toolbarRef.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom < 80)
    }, { rootMargin: '-80px 0px 0px 0px' })
    observer.observe(toolbarRef.current)
    return () => observer.disconnect()
  }, [toolbarRef])
  useEffect(() => {
    if (!completionRef.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      setAtCompletion(entry.boundingClientRect.top < window.innerHeight)
    })
    observer.observe(completionRef.current)
    return () => observer.disconnect()
  }, [completionRef])
  const chapters: Array<[string, string, boolean]> = [
    ['opening', '導讀', Boolean(lesson.opening)],
    ['vocabulary', '單字', Boolean(lesson.vocabulary?.length)],
    ['reading', '閱讀', Boolean(lesson.reading)],
    ['instruction', '文法焦點', Boolean(lesson.instruction?.length)],
    ['practice', '課堂練習', Boolean(lesson.practice?.length)],
    ['selfcheck', '自我檢核', Boolean(lesson.selfCheckZh?.length)],
    ['homework', '課後作業', Boolean(lesson.homework?.questions?.length)],
  ]
  if (!visible || atCompletion) return null
  return <nav className="paper-quick-nav" aria-label="隨時切換章節">
      <select aria-label="跳到教材章節" value="" onChange={event => onJump(event.target.value)}>
        <option value="" disabled>跳到其他章節</option>
        {chapters.filter(([, , available]) => available).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
    </nav>
}
