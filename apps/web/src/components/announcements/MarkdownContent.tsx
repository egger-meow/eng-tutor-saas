import React from 'react'

function isSafeUrl(url: string): boolean {
  try {
    const trimmed = url.trim()
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true
    const parsed = new URL(trimmed)
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // Tokenize bold and links safely
  // Regex pattern matches:
  // 1. **bold** or __bold__
  // 2. [link text](url)
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]+\))/g
  const parts = text.split(pattern)

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (!part) return null

    // Bold (**text** or __text__)
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      const inner = part.slice(2, -2)
      return <strong key={key}>{inner}</strong>
    }

    // Link ([text](url))
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      const [, linkText, href] = linkMatch
      if (isSafeUrl(href)) {
        const isExternal = href.startsWith('http://') || href.startsWith('https://')
        return (
          <a
            key={key}
            href={href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="announcement-inline-link"
          >
            {linkText}
          </a>
        )
      }
      return <span key={key}>{linkText}</span>
    }

    // Plain text
    return <React.Fragment key={key}>{part}</React.Fragment>
  })
}

interface MarkdownContentProps {
  content: string
  className?: string
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  if (!content || typeof content !== 'string') {
    return null
  }

  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')

  const elements: React.ReactNode[] = []
  let index = 0
  let blockKey = 0

  while (index < lines.length) {
    const line = lines[index]

    // Blank line
    if (!line.trim()) {
      index++
      continue
    }

    // Heading (e.g. # Title, ## Subtitle, ### Heading)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const key = `h-${blockKey++}`
      if (level === 1) {
        elements.push(<h2 key={key} className="announcement-heading-1">{renderInline(text, key)}</h2>)
      } else if (level === 2) {
        elements.push(<h3 key={key} className="announcement-heading-2">{renderInline(text, key)}</h3>)
      } else {
        elements.push(<h4 key={key} className="announcement-heading-3">{renderInline(text, key)}</h4>)
      }
      index++
      continue
    }

    // Unordered List (lines starting with - or * )
    if (/^\s*[-*]\s+/.test(line)) {
      const listItems: string[] = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        listItems.push(lines[index].replace(/^\s*[-*]\s+/, ''))
        index++
      }
      const listKey = `ul-${blockKey++}`
      elements.push(
        <ul key={listKey} className="announcement-list announcement-ul">
          {listItems.map((item, i) => (
            <li key={`${listKey}-li-${i}`}>{renderInline(item, `${listKey}-li-${i}`)}</li>
          ))}
        </ul>
      )
      continue
    }

    // Ordered List (lines starting with 1. , 2. etc.)
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = []
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        listItems.push(lines[index].replace(/^\s*\d+\.\s+/, ''))
        index++
      }
      const listKey = `ol-${blockKey++}`
      elements.push(
        <ol key={listKey} className="announcement-list announcement-ol">
          {listItems.map((item, i) => (
            <li key={`${listKey}-li-${i}`}>{renderInline(item, `${listKey}-li-${i}`)}</li>
          ))}
        </ol>
      )
      continue
    }

    // Blockquote
    if (/^\s*>\s+/.test(line)) {
      const quoteLines: string[] = []
      while (index < lines.length && /^\s*>\s+/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s+/, ''))
        index++
      }
      const quoteKey = `quote-${blockKey++}`
      elements.push(
        <blockquote key={quoteKey} className="announcement-blockquote">
          {quoteLines.map((qLine, i) => (
            <p key={`${quoteKey}-p-${i}`}>{renderInline(qLine, `${quoteKey}-p-${i}`)}</p>
          ))}
        </blockquote>
      )
      continue
    }

    // Paragraph (collect contiguous non-empty, non-list, non-heading lines)
    const paragraphLines: string[] = []
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !/^\s*>\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index])
      index++
    }

    if (paragraphLines.length > 0) {
      const pKey = `p-${blockKey++}`
      elements.push(
        <p key={pKey} className="announcement-paragraph">
          {paragraphLines.map((pLine, i) => (
            <React.Fragment key={`${pKey}-line-${i}`}>
              {i > 0 && <br />}
              {renderInline(pLine, `${pKey}-line-${i}`)}
            </React.Fragment>
          ))}
        </p>
      )
    }
  }

  return <div className={`announcement-markdown-body ${className}`}>{elements}</div>
}
