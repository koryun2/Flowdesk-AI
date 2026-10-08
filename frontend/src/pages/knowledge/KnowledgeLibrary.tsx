import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock3,
  FileText,
  Link2,
  Pencil,
  Plus,
  Search,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Skeleton,
} from '../../components/ui'
import { formatRelative } from '../../lib/utils'
import { useToast } from '../../providers/toast'
import { ApiError } from '../../services/authApi'
import { workspaceApi } from '../../services/workspaceApi'
import type { KnowledgeDocument } from '../../types'
import {
  DocumentChunks,
  DocumentCol,
  DocumentIcon,
  DocumentList,
  DocumentRow,
  DocumentStatus,
  DocumentStatusWrap,
  DocumentUpdated,
  LibraryCard,
  TitleButton,
  TitleInput,
  LibraryHeader,
  TableSearch,
  TableSkeleton,
} from './KnowledgePage.styles'

type KnowledgeLibraryProps = {
  search: string
  onSearchChange: (value: string) => void
  documents: KnowledgeDocument[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onAddSource: () => void
  canEdit: boolean
}

export function KnowledgeLibrary({
  search,
  onSearchChange,
  documents,
  isLoading,
  isError,
  onRetry,
  onAddSource,
  canEdit,
}: KnowledgeLibraryProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <LibraryCard>
      <LibraryHeader>
        <div>
          <h2>Sources</h2>
          <p>Documents available for retrieval</p>
        </div>
        <TableSearch>
          <Search size={16} />
          <input
            aria-label="Search knowledge sources"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search sources"
            value={search}
          />
        </TableSearch>
      </LibraryHeader>

      {isError ? (
        <ErrorState
          description="The knowledge API did not respond. Check that the backend is running."
          onRetry={onRetry}
          title="Could not load sources"
        />
      ) : isLoading ? (
        <TableSkeleton>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton $height="54px" key={index} />
          ))}
        </TableSkeleton>
      ) : documents.length ? (
        <DocumentList>
          {documents.map((document) => (
            <DocumentRow key={document.id}>
              <DocumentIcon $sourceType={document.sourceType}>
                {document.sourceType === 'url' ? (
                  <Link2 size={19} />
                ) : (
                  <FileText size={19} />
                )}
              </DocumentIcon>
              <DocumentCol>
                <SourceTitle
                  canEdit={canEdit}
                  document={document}
                  editing={editingId === document.id}
                  onDone={() => setEditingId(null)}
                  onEdit={() => setEditingId(document.id)}
                />
                <small>
                  {document.status === 'failed' && document.errorMessage
                    ? document.errorMessage
                    : `${document.fileName || document.sourceUrl || 'Pasted text'} · ${document.size}`}
                </small>
              </DocumentCol>
              <DocumentChunks>
                <strong>{document.chunks}</strong>
                <small>chunks</small>
              </DocumentChunks>
              <DocumentStatusWrap>
                <DocumentStatus $status={document.status}>
                  {document.status === 'ready' ? (
                    <CheckCircle2 size={13} />
                  ) : (
                    <Clock3 size={13} />
                  )}
                  {document.status}
                </DocumentStatus>
              </DocumentStatusWrap>
              <DocumentUpdated>
                <strong>{formatRelative(document.updatedAt)}</strong>
                <small>by {document.createdBy}</small>
              </DocumentUpdated>
              {canEdit ? (
                <IconButton
                  label={`Rename ${document.title}`}
                  onClick={() => setEditingId(document.id)}
                >
                  <Pencil size={17} />
                </IconButton>
              ) : null}
            </DocumentRow>
          ))}
        </DocumentList>
      ) : (
        <EmptyState
          action={
            <Button icon={Plus} onClick={onAddSource} size="sm">
              Add source
            </Button>
          }
          description="Add a file, URL, or text source to power grounded answers."
          title="No sources found"
        />
      )}
    </LibraryCard>
  )
}

function SourceTitle({
  document,
  canEdit,
  editing,
  onEdit,
  onDone,
}: {
  document: KnowledgeDocument
  canEdit: boolean
  editing: boolean
  onEdit: () => void
  onDone: () => void
}) {
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(document.title)
  const saving = useRef(false)
  const skipBlur = useRef(false)
  const save = useMutation({
    mutationFn: (next: string) => workspaceApi.renameDocument(document.id, next),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
      notify('Source title saved')
      onDone()
    },
    onError: (error) => {
      const message =
        error instanceof ApiError
          ? Object.values(error.fieldErrors)[0] || error.message
          : 'The title was not saved'
      notify(message, 'error')
    },
  })

  useEffect(() => {
    if (!editing) setTitle(document.title)
  }, [document.title, editing])

  const commit = () => {
    if (skipBlur.current) {
      skipBlur.current = false
      return
    }
    if (saving.current) return
    const next = title.trim()
    if (!next || next === document.title) {
      setTitle(document.title)
      onDone()
      return
    }
    saving.current = true
    save.mutate(next, {
      onSettled: () => {
        saving.current = false
      },
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    }
    if (event.key === 'Escape') {
      skipBlur.current = true
      setTitle(document.title)
      onDone()
    }
  }

  if (editing) {
    return (
      <TitleInput
        aria-label={`Title for ${document.title}`}
        autoFocus
        disabled={save.isPending}
        onBlur={commit}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={onKeyDown}
        value={title}
      />
    )
  }

  if (!canEdit) return <strong>{document.title}</strong>

  return (
    <TitleButton onClick={onEdit} type="button">
      {document.title}
    </TitleButton>
  )
}
