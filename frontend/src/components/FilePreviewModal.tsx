import DOMPurify from 'dompurify'
import mammoth from 'mammoth'
import { useEffect, useMemo, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import styled from 'styled-components'
import { authorizedFetch } from '../services/authApi'
import { downloadStoredFile, openStoredFile } from './StoredImage'
import { Button, Modal } from './ui'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export type PreviewFile = {
  path: string
  fileName: string
  mimeType?: string
}

type PreviewKind = 'pdf' | 'image' | 'text' | 'markdown' | 'json' | 'csv' | 'docx' | 'unsupported'

const KIND_LABEL: Record<PreviewKind, string> = {
  pdf: 'PDF',
  image: 'Image',
  text: 'Text',
  markdown: 'Markdown',
  json: 'JSON',
  csv: 'CSV',
  docx: 'Word',
  unsupported: 'File',
}

function previewKind(fileName: string, mimeType = ''): PreviewKind {
  const name = fileName.toLowerCase()
  const mime = mimeType.toLowerCase()
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/.test(name)) return 'image'
  if (name.endsWith('.docx') || mime.includes('wordprocessingml')) return 'docx'
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'markdown'
  if (name.endsWith('.json') || mime.includes('json')) return 'json'
  if (name.endsWith('.csv') || mime.includes('csv')) return 'csv'
  if (mime.startsWith('text/') || /\.(txt|html?|log)$/.test(name)) return 'text'
  return 'unsupported'
}

function imageType(fileName: string, mimeType = '') {
  if (mimeType.startsWith('image/')) return mimeType
  const name = fileName.toLowerCase()
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"'
          index += 1
        } else quoted = false
      } else cell += char
      continue
    }
    if (char === '"') quoted = true
    else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') cell += char
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((item) => item.some((value) => value.trim()))
}

function downloadBuffer(data: ArrayBuffer, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type: type || 'application/octet-stream' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

const Stage = styled.div`
  max-height: min(68vh, 760px);
  overflow: auto;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  background: #f7f8fb;
`

const Tools = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 12px;

  button {
    min-width: 32px;
    height: 32px;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 8px;
    background: #fff;
    color: ${({ theme }) => theme.text};
  }

  button:disabled {
    opacity: 0.45;
  }
`

const Sheet = styled.div<{ $scale: number }>`
  width: ${({ $scale }) => Math.round($scale * 100)}%;
  margin: 0 auto;
  padding: 18px;
  background: #fff;

  .react-pdf__Page {
    margin: 0 auto;
  }
`

const PreviewImage = styled.img<{ $scale: number }>`
  display: block;
  width: ${({ $scale }) => Math.round($scale * 100)}%;
  max-width: none;
  margin: 0 auto;
`

const TextBody = styled.pre`
  margin: 0;
  padding: 18px;
  overflow: auto;
  background: #fff;
  color: ${({ theme }) => theme.text};
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
`

const CsvTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  font-size: 12px;

  th,
  td {
    border: 1px solid ${({ theme }) => theme.border};
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f7f8fb;
  }
`

const DocxBody = styled.div`
  padding: 18px 22px 28px;
  background: #fff;
  color: ${({ theme }) => theme.text};
  font-size: 14px;
  line-height: 1.55;

  h1,
  h2,
  h3 {
    margin: 0 0 12px;
  }

  p,
  ul,
  ol {
    margin: 0 0 12px;
  }

  table {
    width: 100%;
    margin-bottom: 12px;
    border-collapse: collapse;
  }

  td,
  th {
    border: 1px solid ${({ theme }) => theme.border};
    padding: 6px 8px;
    vertical-align: top;
  }

  img {
    max-width: 100%;
  }
`

const MarkdownBody = styled.div`
  padding: 18px 22px;
  background: #fff;
  color: ${({ theme }) => theme.text};
  font-size: 14px;
  line-height: 1.55;

  h1,
  h2,
  p,
  ul,
  ol {
    margin: 0 0 10px;
  }

  h1 {
    font-size: 22px;
  }

  h2 {
    font-size: 18px;
  }

  ul,
  ol {
    padding-left: 20px;
  }
`

const StatusText = styled.p`
  margin: 0;
  padding: 28px 12px;
  color: ${({ theme }) => theme.textSecondary};
  text-align: center;
`

const Details = styled.dl`
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 8px 4px 0;

  div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  dt {
    color: ${({ theme }) => theme.textTertiary};
  }

  dd {
    margin: 0;
    color: ${({ theme }) => theme.text};
  }
`

function MarkdownView({ text }: { text: string }) {
  const blocks: Array<{ type: 'h1' | 'h2' | 'p' | 'ul' | 'ol'; text?: string; items?: string[] }> = []
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null
  const flush = () => {
    if (!list) return
    blocks.push(list)
    list = null
  }
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const heading = /^(#{1,2})\s+(.*)$/.exec(line)
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    const numbered = /^\d+\.\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      blocks.push({ type: heading[1].length === 1 ? 'h1' : 'h2', text: heading[2] })
    } else if (bullet) {
      if (!list || list.type !== 'ul') {
        flush()
        list = { type: 'ul', items: [] }
      }
      list.items.push(bullet[1])
    } else if (numbered) {
      if (!list || list.type !== 'ol') {
        flush()
        list = { type: 'ol', items: [] }
      }
      list.items.push(numbered[1])
    } else {
      flush()
      if (line.trim()) blocks.push({ type: 'p', text: line })
    }
  }
  flush()
  return (
    <MarkdownBody>
      {blocks.map((block, index) => {
        if (block.type === 'h1') return <h1 key={index}>{block.text}</h1>
        if (block.type === 'h2') return <h2 key={index}>{block.text}</h2>
        if (block.type === 'ul' || block.type === 'ol') {
          const Tag = block.type
          return (
            <Tag key={index}>
              {block.items?.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </Tag>
          )
        }
        return <p key={index}>{block.text}</p>
      })}
    </MarkdownBody>
  )
}

function TextPreview({ kind, text }: { kind: 'text' | 'markdown' | 'json' | 'csv'; text: string }) {
  const shown = text.length > 200_000 ? `${text.slice(0, 200_000)}\n\n…` : text
  if (kind === 'markdown') return <MarkdownView text={shown} />
  if (kind === 'json') {
    let pretty = shown
    try {
      pretty = JSON.stringify(JSON.parse(shown), null, 2)
    } catch {
      pretty = shown
    }
    return <TextBody>{pretty}</TextBody>
  }
  if (kind === 'csv') {
    const rows = parseCsv(shown).slice(0, 200)
    if (rows.length > 1) {
      const [header, ...body] = rows
      return (
        <CsvTable>
          <thead>
            <tr>
              {header.map((cell, index) => (
                <th key={index}>{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </CsvTable>
      )
    }
  }
  return <TextBody>{shown}</TextBody>
}

function DocxPreview({ data }: { data: ArrayBuffer }) {
  const [html, setHtml] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    mammoth
      .convertToHtml({ arrayBuffer: data })
      .then((result) => {
        if (cancelled) return
        setHtml(
          DOMPurify.sanitize(result.value, {
            USE_PROFILES: { html: true },
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'style'],
          }),
        )
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [data])

  if (failed) return <StatusText>This Word document could not be previewed.</StatusText>
  if (!html) return <StatusText>Preparing the document…</StatusText>
  return <DocxBody dangerouslySetInnerHTML={{ __html: html }} />
}

export function FilePreviewModal({
  file,
  onClose,
}: {
  file: PreviewFile | null
  onClose: () => void
}) {
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [scale, setScale] = useState(1)
  const [imageUrl, setImageUrl] = useState('')
  const kind = file ? previewKind(file.fileName, file.mimeType) : 'unsupported'

  const filePath = file?.path ?? ''
  const fileName = file?.fileName ?? ''
  const mimeType = file?.mimeType ?? ''

  useEffect(() => {
    if (!filePath) return
    let cancelled = false
    setBytes(null)
    setError('')
    setLoading(true)
    setPage(1)
    setPages(0)
    setScale(1)
    authorizedFetch(filePath)
      .then(async (response) => {
        if (!response.ok) throw new Error('missing')
        return response.arrayBuffer()
      })
      .then((buffer) => {
        if (!cancelled) setBytes(buffer)
      })
      .catch(() => {
        if (!cancelled) setError('The file could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filePath])

  useEffect(() => {
    if (!bytes || kind !== 'image') {
      setImageUrl('')
      return
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: imageType(fileName, mimeType) }))
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [bytes, fileName, kind, mimeType])

  const download = () => {
    if (!file) return
    if (bytes) {
      downloadBuffer(bytes, file.fileName, file.mimeType || '')
      return
    }
    void downloadStoredFile(file.path, file.fileName)
  }

  const pdfBytes = useMemo(() => (bytes && kind === 'pdf' ? { data: bytes.slice(0) } : null), [bytes, kind])
  const text =
    bytes && (kind === 'text' || kind === 'markdown' || kind === 'json' || kind === 'csv')
      ? new TextDecoder().decode(bytes)
      : ''

  return (
    <Modal
      description={file ? `${KIND_LABEL[kind]} · Knowledge Base` : undefined}
      footer={
        <>
          <Button
            disabled={!file || loading}
            onClick={() => {
              if (!file) return
              void openStoredFile(file.path, file.fileName)
            }}
            variant="secondary"
          >
            Open original
          </Button>
          <Button disabled={!file || loading} onClick={download}>
            Download file
          </Button>
        </>
      }
      layer={140}
      onClose={onClose}
      open={Boolean(file)}
      title={file?.fileName || 'File'}
      width="lg"
    >
      {loading ? <StatusText>Loading preview…</StatusText> : null}
      {error ? <StatusText>{error}</StatusText> : null}
      {!loading && !error && bytes && kind === 'pdf' ? (
        <>
          <Tools>
            <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">
              Prev
            </button>
            <span>
              Page {page} of {pages || 1}
            </span>
            <button
              disabled={pages > 0 && page >= pages}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Next
            </button>
            <button aria-label="Zoom out" onClick={() => setScale((current) => Math.max(0.5, current - 0.25))} type="button">
              −
            </button>
            <span>{Math.round(scale * 100)}%</span>
            <button aria-label="Zoom in" onClick={() => setScale((current) => Math.min(2.5, current + 0.25))} type="button">
              +
            </button>
          </Tools>
          <Stage>
            <Sheet $scale={1}>
              <Document
                file={pdfBytes}
                loading={<StatusText>Opening the PDF…</StatusText>}
                onLoadSuccess={({ numPages }) => setPages(numPages)}
              >
                <Page pageNumber={page} width={Math.round(720 * scale)} />
              </Document>
            </Sheet>
          </Stage>
        </>
      ) : null}
      {!loading && !error && imageUrl ? (
        <>
          <Tools>
            <button aria-label="Zoom out" onClick={() => setScale((current) => Math.max(0.5, current - 0.25))} type="button">
              −
            </button>
            <span>{Math.round(scale * 100)}%</span>
            <button aria-label="Zoom in" onClick={() => setScale((current) => Math.min(3, current + 0.25))} type="button">
              +
            </button>
          </Tools>
          <Stage>
            <PreviewImage $scale={scale} alt={file?.fileName || 'Image'} src={imageUrl} />
          </Stage>
        </>
      ) : null}
      {!loading && !error && bytes && (kind === 'text' || kind === 'markdown' || kind === 'json' || kind === 'csv') ? (
        <Stage>
          <TextPreview kind={kind} text={text} />
        </Stage>
      ) : null}
      {!loading && !error && bytes && kind === 'docx' ? (
        <Stage>
          <DocxPreview data={bytes} />
        </Stage>
      ) : null}
      {!loading && !error && bytes && kind === 'unsupported' ? (
        <>
          <StatusText>This file type cannot be previewed. You can download the original.</StatusText>
          <Details>
            <div>
              <dt>Name</dt>
              <dd>{file?.fileName}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{file?.mimeType || 'Unknown'}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{formatSize(bytes.byteLength)}</dd>
            </div>
          </Details>
        </>
      ) : null}
    </Modal>
  )
}
