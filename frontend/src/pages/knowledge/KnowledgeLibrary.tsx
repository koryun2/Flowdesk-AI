import {
  CheckCircle2,
  Clock3,
  Eye,
  FilePen,
  FileText,
  Link2,
  Plus,
  Search,
} from 'lucide-react'
import { StoredImage } from '../../components/StoredImage'
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Skeleton,
} from '../../components/ui'
import { isImageDocument } from '../../lib/files'
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
  TitleButton,
  LibraryHeader,
  RowActions,
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
  onOpenSource: (document: KnowledgeDocument) => void
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
  onOpenSource,
  canEdit,
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
            placeholder="Search titles and text"
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
              {isImageDocument(document) && document.hasFile ? (
                <StoredImage
                  alt={document.fileName || document.title}
                  path={`/api/v1/documents/${document.id}/file/`}
                />
              ) : (
                <DocumentIcon $sourceType={document.sourceType}>
                  {document.sourceType === 'url' ? (
                    <Link2 size={19} />
                  ) : (
                    <FileText size={19} />
                  )}
                </DocumentIcon>
              )}
              <DocumentCol>
                <TitleButton onClick={() => onOpenSource(document)} type="button">
                  {document.title}
                </TitleButton>
                <small>
                  {document.status === 'failed' && document.errorMessage
                    ? document.errorMessage
                    : `${document.fileName || document.sourceUrl || 'Pasted text'} · ${document.size}`}
                </small>
              </DocumentCol>
              <DocumentChunks>
                {isImageDocument(document) ? (
                  <>
                    <strong>Image</strong>
                    <small>file</small>
                  </>
                ) : (
                  <>
                    <strong>{document.chunks}</strong>
                    <small>chunks</small>
                  </>
                )}
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
              <RowActions>
                <IconButton
                  label={`${canEdit ? 'Edit' : 'View'} ${document.title}`}
                  onClick={() => onOpenSource(document)}
                >
                  {canEdit ? <FilePen size={17} /> : <Eye size={17} />}
                </IconButton>
              </RowActions>
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
