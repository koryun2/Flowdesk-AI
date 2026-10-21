import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FormError, FormField } from '../../components/fields'
import { downloadStoredFile, StoredImage } from '../../components/StoredImage'
import { Button, Modal } from '../../components/ui'
import { isImageDocument } from '../../lib/files'
import { useToast } from '../../providers/toast'
import { ApiError } from '../../services/authApi'
import { workspaceApi } from '../../services/workspaceApi'
import type { KnowledgeDocument } from '../../types'
import { EditFooter, FieldNote, FileDropzone, SourcePreview } from './KnowledgePage.styles'

type EditSourceFormProps = {
  document: KnowledgeDocument | null
  canEdit: boolean
  onClose: () => void
}

export function EditSourceForm({ document, canEdit, onClose }: EditSourceFormProps) {
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [formError, setFormError] = useState('')
  const loadedFor = useRef<string | null>(null)
  const contentQuery = useQuery({
    queryKey: ['document-content', document?.id],
    queryFn: () => workspaceApi.documentContent(document!.id),
    enabled: Boolean(document),
  })

  useEffect(() => {
    if (!document) {
      loadedFor.current = null
      return
    }
    if (!contentQuery.data || loadedFor.current === document.id) return
    loadedFor.current = document.id
    setTitle(document.title)
    setContent(contentQuery.data.content)
    setSourceUrl(contentQuery.data.source_url || '')
    setFile(null)
    setFormError('')
  }, [contentQuery.data, document])

  const refreshStored = async () => {
    await queryClient.invalidateQueries({ queryKey: ['documents'] })
    await queryClient.invalidateQueries({ queryKey: ['document-summary'] })
    await queryClient.invalidateQueries({ queryKey: ['document-content'] })
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    await queryClient.invalidateQueries({ queryKey: ['redis-jobs'] })
  }

  const mutation = useMutation({
    mutationFn: (input: {
      title: string
      content?: string
      sourceUrl?: string
      refresh?: boolean
      file?: File
    }) => workspaceApi.updateDocument(document!.id, input),
    onSuccess: async (updated) => {
      await refreshStored()
      onClose()
      if (updated.status === 'failed') {
        notify(updated.errorMessage || 'The source could not be indexed', 'error')
        return
      }
      if (updated.status === 'processing') {
        notify('Source queued in Redis')
        return
      }
      notify('Source updated')
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(Object.values(error.fieldErrors)[0] || error.message)
        return
      }
      setFormError('The source was not saved.')
    },
  })
  const remove = useMutation({
    mutationFn: () => workspaceApi.deleteDocument(document!.id),
    onSuccess: async () => {
      await refreshStored()
      onClose()
      notify('Source deleted')
    },
    onError: () => notify('The source was not deleted', 'error'),
  })

  const image = document ? isImageDocument(document) : false
  const loaded = contentQuery.data
  const contentChanged = loaded ? content !== loaded.content : false
  const urlChanged =
    document?.sourceType === 'url' && sourceUrl.trim() !== (loaded?.source_url || '')
  const sendsContent =
    !file && !(document?.sourceType === 'url' && urlChanged) && (contentChanged || document?.sourceType === 'text')
  const canSave =
    canEdit &&
    title.trim().length >= 3 &&
    !contentQuery.isLoading &&
    (!sendsContent || content.trim().length >= 40) &&
    (!urlChanged || sourceUrl.trim().length >= 8)

  const save = () => {
    if (!document) return
    setFormError('')
    if (file) {
      mutation.mutate({ title: title.trim(), file })
      return
    }
    if (document.sourceType === 'url' && urlChanged) {
      mutation.mutate({ title: title.trim(), sourceUrl: sourceUrl.trim() })
      return
    }
    if (sendsContent) {
      mutation.mutate({ title: title.trim(), content })
      return
    }
    mutation.mutate({ title: title.trim() })
  }

  return (
    <Modal
      description={document?.title}
      footer={
        <EditFooter>
          {canEdit ? (
            <Button
              disabled={remove.isPending || mutation.isPending}
              onClick={() => {
                if (document && window.confirm(`Delete ${document.title}?`)) remove.mutate()
              }}
              variant="danger"
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div>
            <Button onClick={onClose} variant="secondary">
              {canEdit ? 'Cancel' : 'Close'}
            </Button>
            {canEdit ? (
              <Button disabled={!canSave || mutation.isPending} onClick={save}>
                {mutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            ) : null}
          </div>
        </EditFooter>
      }
      onClose={onClose}
      open={Boolean(document)}
      title={canEdit ? 'Update source' : 'Source'}
      width="lg"
    >
      {formError ? <FormError>{formError}</FormError> : null}
      <FormField>
        <label htmlFor="edit-source-title">Title</label>
        <input
          disabled={!canEdit}
          id="edit-source-title"
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
      </FormField>
      {image && document?.hasFile ? (
        <SourcePreview>
          <StoredImage
            alt={document.fileName || document.title}
            path={`/api/v1/documents/${document.id}/file/`}
            variant="preview"
          />
        </SourcePreview>
      ) : null}
      {document?.hasFile && !image ? (
        <Button
          onClick={() =>
            downloadStoredFile(
              `/api/v1/documents/${document.id}/file/`,
              document.fileName || 'file',
            )
          }
          size="sm"
          variant="secondary"
        >
          Open file
        </Button>
      ) : null}
      {document?.sourceType === 'url' ? (
        <FormField>
          <label htmlFor="edit-source-url">Public URL</label>
          <input
            disabled={!canEdit}
            id="edit-source-url"
            onChange={(event) => setSourceUrl(event.target.value)}
            type="url"
            value={sourceUrl}
          />
          {canEdit ? (
            <Button
              disabled={mutation.isPending || title.trim().length < 3}
              onClick={() => {
                setFormError('')
                mutation.mutate({ title: title.trim(), refresh: true })
              }}
              size="sm"
              variant="secondary"
            >
              Fetch again
            </Button>
          ) : null}
        </FormField>
      ) : null}
      {image ? null : (
        <FormField>
          <label htmlFor="edit-source-text">Stored text</label>
          <textarea
            disabled={!canEdit || contentQuery.isLoading}
            id="edit-source-text"
            onChange={(event) => setContent(event.target.value)}
            rows={10}
            value={contentQuery.isLoading ? '' : content}
          />
          {document?.sourceType === 'file' && canEdit ? (
            <FieldNote>
              Saving edited text replaces the uploaded file. Choose a new file to keep this as an upload.
            </FieldNote>
          ) : null}
          {document?.sourceType === 'url' && canEdit ? (
            <FieldNote>
              Change the URL to fetch that page. Saving edited text stores this source as pasted text.
            </FieldNote>
          ) : null}
        </FormField>
      )}
      {canEdit ? (
        <FileDropzone>
          <FileUp size={25} />
          <strong>{file?.name || 'Replace with a file'}</strong>
          <span>PDF, DOCX, TXT, Markdown, HTML, CSV, JSON, or an image up to 8 MB</span>
          <input
            accept=".pdf,.docx,.txt,.md,.markdown,.html,.htm,.csv,.json,.png,.jpg,.jpeg,.webp,.gif"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </FileDropzone>
      ) : null}
    </Modal>
  )
}
