import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const CODE_RE = /`([^`]+)`/
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/
const BOLD_RE = /\*\*([^*]+)\*\*/
const ITALIC_RE = /\*([^*]+)\*/
const HEADING_RE = /^(#{1,6})\s+(.*)$/
const HR_RE = /^---+$/
const UNORDERED_RE = /^\s*[-•]\s+/
const ORDERED_RE = /^\s*\d+\.\s+/
const TABLE_DELIM_RE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/

type InlineToken = { type: 'code' | 'link' | 'bold' | 'italic'; start: number; end: number; text: string; href?: string }

function safeHref(href: string): string | null {
  const value = href.trim()
  if (/^https?:\/\//i.test(value)) return value
  if (/^mailto:/i.test(value)) return value
  if (/^\/(?!\/)/.test(value)) return value
  if (value.startsWith('#')) return value
  return null
}

function findInlineToken(text: string): InlineToken | null {
  const code = text.match(CODE_RE)
  const link = text.match(LINK_RE)
  const bold = text.match(BOLD_RE)
  const italic = text.match(ITALIC_RE)
  const candidates: Array<{ token: InlineToken; match: RegExpMatchArray }> = []
  if (code) candidates.push({ token: { type: 'code', start: code.index ?? 0, end: (code.index ?? 0) + code[0].length, text: code[1] }, match: code })
  if (link) candidates.push({ token: { type: 'link', start: link.index ?? 0, end: (link.index ?? 0) + link[0].length, text: link[1], href: link[2] }, match: link })
  if (bold) candidates.push({ token: { type: 'bold', start: bold.index ?? 0, end: (bold.index ?? 0) + bold[0].length, text: bold[1] }, match: bold })
  if (italic) candidates.push({ token: { type: 'italic', start: italic.index ?? 0, end: (italic.index ?? 0) + italic[0].length, text: italic[1] }, match: italic })
  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.token.start - b.token.start)
  return candidates[0].token
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let rest = text
  let key = 0
  while (rest.length > 0) {
    const token = findInlineToken(rest)
    if (!token) {
      nodes.push(rest)
      break
    }
    if (token.start > 0) nodes.push(rest.slice(0, token.start))
    const inner = renderInline(token.text)
    if (token.type === 'code') {
      nodes.push(
        <code key={key++} className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
          {token.text}
        </code>,
      )
    } else if (token.type === 'link') {
      const href = safeHref(token.href ?? '')
      nodes.push(
        href ? (
          <a
            key={key++}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {inner}
          </a>
        ) : (
          <span key={key++}>{rest.slice(token.start, token.end)}</span>
        ),
      )
    } else if (token.type === 'bold') {
      nodes.push(<strong key={key++} className="font-semibold text-foreground">{inner}</strong>)
    } else {
      nodes.push(<em key={key++}>{inner}</em>)
    }
    rest = rest.slice(token.end)
  }
  return nodes
}

type Block =
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'hr' }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'paragraph'; text: string }

function splitRow(line: string): string[] {
  const cells = line.split('|').map((cell) => cell.trim())
  if (cells[0] === '') cells.shift()
  if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop()
  return cells
}

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) {
      i += 1
      continue
    }
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const code: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i])
        i += 1
      }
      i += 1
      blocks.push({ kind: 'code', lang, code: code.join('\n') })
      continue
    }
    const heading = line.match(HEADING_RE)
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() })
      i += 1
      continue
    }
    if (HR_RE.test(line)) {
      blocks.push({ kind: 'hr' })
      i += 1
      continue
    }
    if (line.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim())
        i += 1
      }
      if (tableLines.length >= 2 && TABLE_DELIM_RE.test(tableLines[1])) {
        blocks.push({ kind: 'table', header: splitRow(tableLines[0]), rows: tableLines.slice(2).map(splitRow) })
        continue
      }
      blocks.push({ kind: 'paragraph', text: tableLines.join(' ') })
      continue
    }
    if (UNORDERED_RE.test(line) || ORDERED_RE.test(line)) {
      const ordered = ORDERED_RE.test(line)
      const items: string[] = []
      while (i < lines.length) {
        const item = lines[i].trim()
        if (!(ordered ? ORDERED_RE : UNORDERED_RE).test(item)) break
        items.push(item.replace(ordered ? ORDERED_RE : UNORDERED_RE, '').trim())
        i += 1
      }
      blocks.push({ kind: 'list', ordered, items })
      continue
    }
    const paragraph: string[] = []
    while (i < lines.length) {
      const text = lines[i].trim()
      if (!text) break
      if (text.startsWith('```') || HEADING_RE.test(text) || HR_RE.test(text) || text.startsWith('|') || UNORDERED_RE.test(text) || ORDERED_RE.test(text)) break
      paragraph.push(text)
      i += 1
    }
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
  }
  return blocks
}

const HEADING_CLASSES = {
  1: 'text-lg font-bold',
  2: 'text-base font-semibold',
  3: 'text-[15px] font-semibold',
  4: 'text-sm font-semibold',
  5: 'text-sm font-semibold text-foreground/90',
  6: 'text-sm font-semibold text-foreground/80',
} as const

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const blocks = parseBlocks(content)
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      {blocks.map((block, index) => {
        if (block.kind === 'code') {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-lg bg-background/60 p-3 font-mono text-[13px] leading-relaxed text-foreground ring-1 ring-border"
            >
              <code>{block.code}</code>
            </pre>
          )
        }
        if (block.kind === 'heading') {
          const level = block.level > 6 ? 6 : block.level
          const Tag = (`h${level}` as 'h1') as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
          return (
            <Tag key={index} className={cn('text-foreground', HEADING_CLASSES[level as keyof typeof HEADING_CLASSES])}>
              {renderInline(block.text)}
            </Tag>
          )
        }
        if (block.kind === 'hr') {
          return <hr key={index} className="my-0.5 border-border" />
        }
        if (block.kind === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul'
          return (
            <ListTag
              key={index}
              className={cn('flex flex-col gap-1 pl-5', block.ordered ? 'list-decimal' : 'list-disc')}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="leading-relaxed text-secondary-foreground">
                  {renderInline(item)}
                </li>
              ))}
            </ListTag>
          )
        }
        if (block.kind === 'table') {
          return (
            <div key={index} className="overflow-x-auto rounded-lg ring-1 ring-border">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm leading-relaxed">
                <thead>
                  <tr className="bg-background/60">
                    {block.header.map((cell, cellIndex) => (
                      <th key={cellIndex} className="px-3 py-2 font-semibold text-foreground">
                        {renderInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-border/70">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 align-top text-secondary-foreground">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        return (
          <p key={index} className="text-secondary-foreground">
            {renderInline(block.text)}
          </p>
        )
      })}
    </div>
  )
}
