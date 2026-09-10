import type { CurriculumPackage } from '@paper-english/generator'
import { escapeHtml as h } from '../escape-html.js'

type Opening = CurriculumPackage['studentLesson']['opening']

export function renderOpeningActivity(opening: Opening): string {
  if (!('activity' in opening)) {
    return `<section class="warmup-box"><h2>先想一想</h2>
  <div class="warmup-prompt">${h(opening.warmUp)}</div>
  <div class="writing-lines-container"><div class="writing-line"></div><div class="writing-line"></div></div>
</section>`
  }
  const activity = opening.activity
  if (activity.type === 'direct-reading') return ''
  const heading = `<h2>${h(activity.titleZh)}</h2>`
  switch (activity.type) {
    case 'question':
      return `<section class="warmup-box opening-question">${heading}
  <div class="warmup-prompt">${h(activity.prompt)}</div>
  <div class="writing-lines-container">${Array.from({ length: activity.writingLines }, () => '<div class="writing-line"></div>').join('')}</div></section>`
    case 'observation':
      return `<section class="warmup-box opening-observation">${heading}
  <div class="opening-examples">${activity.examples.map((example) => `<div class="opening-example">${h(example)}</div>`).join('')}</div>
  <p class="opening-notice">${h(activity.noticeZh)}</p></section>`
    case 'reading-purpose':
      return `<section class="opening-purpose">${heading}<p>${h(activity.purposeZh)}</p></section>`
  }
}
