import {
  CheckCircle2,
  Clock3,
  FileText,
  Link2,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react'
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Skeleton,
} from '../../components/ui'
import { formatRelative } from '../../lib/utils'
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
}

export function KnowledgeLibrary({
  search,
  onSearchChange,
  documents,
  isLoading,
  isError,
  onRetry,
  onAddSource,
}: KnowledgeLibraryProps) {
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
                <strong>{document.title}</strong>
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
              <IconButton label={`Actions for ${document.title}`}>
                <MoreHorizontal size={17} />
              </IconButton>
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
