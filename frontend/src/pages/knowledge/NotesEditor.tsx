import { useEffect, useRef } from 'react'
import {
  List,
  ListOrdered,
} from 'lucide-react'
import {
  NotesEmpty,
  NotesRead,
  NotesShell,
  NotesSurface,
  NotesTool,
  NotesToolbar,
} from './KnowledgePage.styles'

type Block =
  | { type: 'h1' | 'h2' | 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }

function parseNotes(source: string): Block[] {
  const blocks: Block[] = []
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null
  const flush = () => {
    if (!list) return
    blocks.push(list)
    list = null
  }
  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    const heading = /^(#{1,2})\s+(.*)$/.exec(line)
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    const numbered = /^\d+\.\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      blocks.push({ type: heading[1].length === 1 ? 'h1' : 'h2', text: heading[2] })
      continue
    }
    if (bullet) {
      if (!list || list.type !== 'ul') {
        flush()
        list = { type: 'ul', items: [] }
      }
      list.items.push(bullet[1])
      continue
    }
    if (numbered) {
      if (!list || list.type !== 'ol') {
        flush()
        list = { type: 'ol', items: [] }
      }
      list.items.push(numbered[1])
      continue
    }
    flush()
    if (line.trim()) blocks.push({ type: 'p', text: line })
  }
  flush()
  return blocks
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inlineHtml(text: string) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function markdownToHtml(source: string) {
  return parseNotes(source)
    .map((block) => {
      if (block.type === 'h1') return `<h1>${inlineHtml(block.text)}</h1>`
      if (block.type === 'h2') return `<h2>${inlineHtml(block.text)}</h2>`
      if (block.type === 'ul') {
        return `<ul>${block.items.map((item) => `<li>${inlineHtml(item)}</li>`).join('')}</ul>`
      }
      if (block.type === 'ol') {
        return `<ol>${block.items.map((item) => `<li>${inlineHtml(item)}</li>`).join('')}</ol>`
      }
      return `<p>${inlineHtml(block.type === 'p' || block.type === 'h1' || block.type === 'h2' ? block.text : '')}</p>`
    })
    .join('')
}

function inlineText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
  if (!(node instanceof HTMLElement)) return ''
  if (node.tagName === 'BR') return '\n'
  const inner = Array.from(node.childNodes).map(inlineText).join('')
  if (node.tagName === 'STRONG' || node.tagName === 'B') return `**${inner}**`
  if (node.tagName === 'EM' || node.tagName === 'I') return `*${inner}*`
  return inner
}

function htmlToMarkdown(root: HTMLElement) {
  const blocks: string[] = []
  const visit = (node: HTMLElement) => {
    const tag = node.tagName
    if (tag === 'H1') {
      blocks.push(`# ${inlineText(node).trim()}`)
      return
    }
    if (tag === 'H2') {
      blocks.push(`## ${inlineText(node).trim()}`)
      return
    }
    if (tag === 'UL' || tag === 'OL') {
      let number = 1
      node.querySelectorAll(':scope > li').forEach((item) => {
        const text = inlineText(item).trim()
        blocks.push(tag === 'UL' ? `- ${text}` : `${number}. ${text}`)
        number += 1
      })
      return
    }
    if ((tag === 'DIV' || tag === 'P') && node.querySelector('h1, h2, ul, ol')) {
      Array.from(node.children).forEach((child) => {
        if (child instanceof HTMLElement) visit(child)
      })
      return
    }
    const text = inlineText(node).trim()
    if (text) blocks.push(text)
  }
  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '').trim()
      if (text) blocks.push(text)
      return
    }
    if (node instanceof HTMLElement) visit(node)
  })
  return blocks.join('\n')
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

function NotesView({ text }: { text: string }) {
  if (!text.trim()) return <NotesEmpty>No notes yet.</NotesEmpty>
  return (
    <NotesRead>
      {parseNotes(text).map((block, index) => {
        if (block.type === 'h1') return <h1 key={index}><Inline text={block.text} /></h1>
        if (block.type === 'h2') return <h2 key={index}><Inline text={block.text} /></h2>
        if (block.type === 'ul') {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          )
        }
        if (block.type === 'ol') {
          return (
            <ol key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inline text={item} />
                </li>
              ))}
            </ol>
          )
        }
        return <p key={index}><Inline text={block.type === 'p' ? block.text : ''} /></p>
      })}
    </NotesRead>
  )
}

export function NotesEditor({
  editing,
  onChange,
  seed,
  value,
}: {
  editing: boolean
  seed: string
  value: string
  onChange: (value: string) => void
}) {
  const surface = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editing || !surface.current) return
    surface.current.innerHTML = markdownToHtml(seed)
  }, [editing, seed])

  const applyFormat = (command: string, commandValue?: string) => {
    surface.current?.focus()
    document.execCommand(command, false, commandValue)
    if (surface.current) onChange(htmlToMarkdown(surface.current))
  }

  if (!editing) return <NotesView text={value} />

  return (
    <NotesShell>
      <NotesToolbar>
        <NotesTool onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('formatBlock', 'H1')} type="button">
          H1
        </NotesTool>
        <NotesTool onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('formatBlock', 'H2')} type="button">
          H2
        </NotesTool>
        <NotesTool onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('bold')} type="button">
          B
        </NotesTool>
        <NotesTool onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('italic')} type="button">
          <em>I</em>
        </NotesTool>
        <NotesTool aria-label="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('insertUnorderedList')} type="button">
          <List size={14} />
        </NotesTool>
        <NotesTool aria-label="Numbered list" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('insertOrderedList')} type="button">
          <ListOrdered size={14} />
        </NotesTool>
      </NotesToolbar>
      <NotesSurface
        contentEditable
        onInput={() => {
          if (surface.current) onChange(htmlToMarkdown(surface.current))
        }}
        ref={surface}
        role="textbox"
        aria-multiline="true"
        aria-label="Notes"
      />
    </NotesShell>
  )
}
