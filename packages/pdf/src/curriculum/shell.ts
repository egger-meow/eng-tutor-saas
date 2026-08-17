import { escapeHtml as h } from '../escape-html.js'
import { curriculumStyles } from './styles.js'

export function renderCurriculumShell(title: string, bodyContent: string): string {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <title>${h(title)}</title>
  <style>${curriculumStyles}</style>
</head>
<body>
  ${bodyContent}
</body>
</html>`
}
