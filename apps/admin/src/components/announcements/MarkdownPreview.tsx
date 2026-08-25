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
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]+\))/g
  const parts = text.split(pattern)

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (!part) return null

    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      const inner = part.slice(2, -2)
      return <strong key={key}>{inner}</strong>
    }

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
            style={{ color: '#2563eb', textDecoration: 'underline' }}
          >
            {linkText}
          </a>
        )
      }
      return <span key={key}>{linkText}</span>
    }

    return <React.Fragment key={key}>{part}</React.Fragment>
  })
}

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className = '' }) => {
  if (!content || typeof content !== 'string') {
    return <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>尚無內容可供預覽</div>
  }

  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')

  const elements: React.ReactNode[] = []
  let index = 0
  let blockKey = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index++
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const key = `h-${blockKey++}`
      if (level === 1) {
        elements.push(<h2 key={key} style={{ fontSize: '1.3rem', margin: '16px 0 8px', color: '#1e293b' }}>{renderInline(text, key)}</h2>)
      } else if (level === 2) {
        elements.push(<h3 key={key} style={{ fontSize: '1.15rem', margin: '14px 0 6px', color: '#1e293b' }}>{renderInline(text, key)}</h3>)
      } else {
        elements.push(<h4 key={key} style={{ fontSize: '1rem', margin: '12px 0 4px', color: '#1e293b' }}>{renderInline(text, key)}</h4>)
      }
      index++
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const listItems: string[] = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        listItems.push(lines[index].replace(/^\s*[-*]\s+/, ''))
        index++
      }
      const listKey = `ul-${blockKey++}`
      elements.push(
        <ul key={listKey} style={{ margin: '0 0 12px 20px', padding: 0 }}>
          {listItems.map((item, i) => (
            <li key={`${listKey}-li-${i}`} style={{ marginBottom: '4px' }}>{renderInline(item, `${listKey}-li-${i}`)}</li>
          ))}
        </ul>
      )
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = []
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        listItems.push(lines[index].replace(/^\s*\d+\.\s+/, ''))
        index++
      }
      const listKey = `ol-${blockKey++}`
      elements.push(
        <ol key={listKey} style={{ margin: '0 0 12px 20px', padding: 0 }}>
          {listItems.map((item, i) => (
            <li key={`${listKey}-li-${i}`} style={{ marginBottom: '4px' }}>{renderInline(item, `${listKey}-li-${i}`)}</li>
          ))}
        </ol>
      )
      continue
    }

    if (/^\s*>\s+/.test(line)) {
      const quoteLines: string[] = []
      while (index < lines.length && /^\s*>\s+/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s+/, ''))
        index++
      }
      const quoteKey = `quote-${blockKey++}`
      elements.push(
        <blockquote key={quoteKey} style={{ margin: '12px 0', paddingLeft: '12px', borderLeft: '3px solid #cbd5e1', color: '#64748b' }}>
          {quoteLines.map((qLine, i) => (
            <p key={`${quoteKey}-p-${i}`} style={{ margin: '0 0 4px' }}>{renderInline(qLine, `${quoteKey}-p-${i}`)}</p>
          ))}
        </blockquote>
      )
      continue
    }

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
        <p key={pKey} style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
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

  return <div className={`markdown-preview-root ${className}`}>{elements}</div>
}
